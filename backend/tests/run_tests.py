import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app
from backend.models.schemas import ProcessInputRequest, SimulationRequest, UserRegisterRequest, UserLoginRequest
from backend.services.emission_engine import calculate_facility_emissions
from backend.services.recommendation_engine import generate_circular_recommendations
from backend.services.simulation_engine import run_what_if_simulation
from backend.services.auth_service import auth_service
from backend.services.db_repository import db_repository
from backend.data.fallback_factors import DEMO_INPUT_PRESET

client = TestClient(app)

class TestCarbonLensEngine(unittest.TestCase):

    def test_full_calculation(self):
        inputs = ProcessInputRequest(**DEMO_INPUT_PRESET)
        result, raw_sources = calculate_facility_emissions(inputs, is_demo=True)
        self.assertGreaterThan(result.total_co2e_tonnes, 0)
        self.assertFalse(result.is_partial_estimate)
        self.assertEqual(result.confidence_breakdown.confidence_score, 100)
        self.assertGreaterThan(len(result.leak_points), 0)
        self.assertEqual(result.leak_points[0].rank, 1)
        self.assertEqual(result.leak_points[0].source_key, "virgin_polymer")
        print("[PASS] Test 1: Full Calculation Passed")

    def test_incomplete_input(self):
        inputs = ProcessInputRequest(
            facility_name="Partial Test SME",
            grid_electricity_kwh=20000.0,
            virgin_material_kg=15000.0,
            diesel_liters=None,
            scrap_landfilled_kg=None
        )
        result, _ = calculate_facility_emissions(inputs, is_demo=False)
        self.assertTrue(result.is_partial_estimate)
        self.assertLessThan(result.confidence_breakdown.confidence_score, 100)
        self.assertIsNotNone(result.missing_data_warning)
        self.assertIn("Electricity", result.category_breakdown)
        self.assertIn("Raw Materials", result.category_breakdown)
        self.assertNotIn("Thermal Energy", result.category_breakdown)
        print("[PASS] Test 2: Incomplete Input Passed")

    def test_material_hotspot(self):
        inputs = ProcessInputRequest(
            facility_name="Material Heavy SME",
            virgin_material_kg=80000.0,
            grid_electricity_kwh=5000.0
        )
        result, _ = calculate_facility_emissions(inputs)
        self.assertEqual(result.leak_points[0].source_key, "virgin_polymer")
        self.assertGreaterThan(result.leak_points[0].percentage, 50.0)
        print("[PASS] Test 3: Material Hotspot Passed")

    def test_electricity_hotspot(self):
        inputs = ProcessInputRequest(
            facility_name="Energy Heavy SME",
            virgin_material_kg=2000.0,
            grid_electricity_kwh=100000.0
        )
        result, _ = calculate_facility_emissions(inputs)
        self.assertEqual(result.leak_points[0].source_key, "grid_electricity")
        self.assertGreaterThan(result.leak_points[0].percentage, 50.0)
        print("[PASS] Test 4: Electricity Hotspot Passed")

    def test_what_if_simulation_math(self):
        inputs = ProcessInputRequest(**DEMO_INPUT_PRESET)
        sim_req = SimulationRequest(
            assessment_inputs=inputs,
            custom_pcr_blend_pct=30.0,
            custom_regrind_recovery_pct=50.0,
            custom_renewable_electricity_pct=30.0
        )
        sim_res = run_what_if_simulation(sim_req)
        self.assertGreaterThan(sim_res.baseline_co2e_tonnes, sim_res.projected_co2e_tonnes)
        self.assertGreaterThan(sim_res.net_reduction_tonnes, 0)
        self.assertGreaterThan(sim_res.net_reduction_pct, 0)
        self.assertEqual(len(sim_res.applied_levers), 3)
        print("[PASS] Test 5: What-If Simulation Math Passed")

    def test_auth_and_facility_flow(self):
        reg_req = UserRegisterRequest(
            full_name="Rajesh Patel",
            email="rajesh@test.local",
            password="securepassword123"
        )
        reg_res = auth_service.register_user(reg_req)
        self.assertIsNotNone(reg_res.access_token)
        self.assertEqual(reg_res.user.email, "rajesh@test.local")

        login_req = UserLoginRequest(email="rajesh@test.local", password="securepassword123")
        login_res = auth_service.login_user(login_req)
        self.assertIsNotNone(login_res.access_token)

        fac_req = {
            "facility_name": "Sanand Extrusion Unit 2",
            "company_name": "Polymer Pack India",
            "industry": "Plastic & Packaging Manufacturing",
            "city": "Sanand",
            "state": "Gujarat"
        }
        fac = db_repository.create_facility(login_res.user.id, fac_req)
        self.assertEqual(fac["facility_name"], "Sanand Extrusion Unit 2")

        user_facs = db_repository.get_user_facilities(login_res.user.id)
        self.assertEqual(len(user_facs), 1)
        self.assertEqual(user_facs[0]["id"], fac["id"])
        print("[PASS] Test 6: Auth and Facility Flow Passed")

    def test_direct_api_account_isolation(self):
        # 1. Register User A and create Facility A + Assessment A
        reg_a = auth_service.register_user(UserRegisterRequest(full_name="User A", email="usera@test.local", password="passwordA123"))
        token_a = reg_a.access_token
        headers_a = {"Authorization": f"Bearer {token_a}"}

        fac_a_res = client.post("/api/facilities", json={"facility_name": "Facility A", "city": "Surat"}, headers=headers_a)
        fac_a = fac_a_res.json()

        asm_a_res = client.post("/api/assessments", json={
            "facility_id": fac_a["id"],
            "facility_name": "Facility A",
            "grid_electricity_kwh": 10000.0,
            "virgin_material_kg": 5000.0
        }, headers=headers_a)
        asm_a = asm_a_res.json()

        # 2. Register User B
        reg_b = auth_service.register_user(UserRegisterRequest(full_name="User B", email="userb@test.local", password="passwordB123"))
        token_b = reg_b.access_token
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User B attempts to access Assessment A directly -> Expected 403 Forbidden
        get_asm_res = client.get(f"/api/assessments/{asm_a['id']}", headers=headers_b)
        self.assertEqual(get_asm_res.status_code, 403)
        self.assertIn("forbidden", get_asm_res.json()["detail"].lower())

        # 4. User B attempts to access Facility A directly -> Expected 403 Forbidden
        get_fac_res = client.get(f"/api/facilities/{fac_a['id']}", headers=headers_b)
        self.assertEqual(get_fac_res.status_code, 403)
        self.assertIn("forbidden", get_fac_res.json()["detail"].lower())
        print("[PASS] Test 7: Direct API Account Isolation (403 Forbidden) Passed")

    def test_new_user_with_no_data(self):
        # Register New User C and create Facility C
        reg_c = auth_service.register_user(UserRegisterRequest(full_name="User C", email="userc@test.local", password="passwordC123"))
        token_c = reg_c.access_token
        headers_c = {"Authorization": f"Bearer {token_c}"}

        fac_c_res = client.post("/api/facilities", json={"facility_name": "Facility C Zero Data", "city": "Vapi"}, headers=headers_c)
        fac_c = fac_c_res.json()

        # Retrieve latest user assessment before running any assessment
        latest_res = client.get(f"/api/assessments/user/latest?facility_id={fac_c['id']}", headers=headers_c)
        self.assertEqual(latest_res.status_code, 200)
        self.assertIsNone(latest_res.json())  # ZERO carbon metrics, zero charts, zero leak points
        print("[PASS] Test 8: New User With No Data (Empty State) Passed")

    def test_location_aware_partner_discovery(self):
        from backend.services.partner_discovery import partner_discovery_service

        # Test Surat discovery
        surat_res = partner_discovery_service.discover_partners(city="Surat", state="Gujarat")
        self.assertEqual(surat_res["city"], "Surat")
        self.assertIsNotNone(surat_res["search_status"])
        self.assertGreaterThan(len(surat_res["partners"]), 0)

        # Test Vadodara discovery
        vadodara_res = partner_discovery_service.discover_partners(city="Vadodara", state="Gujarat")
        self.assertEqual(vadodara_res["city"], "Vadodara")
        self.assertGreaterThan(len(vadodara_res["partners"]), 0)
        print("[PASS] Test 9: Gujarat Location-Aware Recycler Discovery Passed")

    def test_pdf_report_generation(self):
        # 1. Test Demo PDF endpoint
        demo_pdf_res = client.get("/api/assessments/demo/load")
        self.assertEqual(demo_pdf_res.status_code, 200)
        demo_asm = demo_pdf_res.json()

        pdf_download_res = client.get(f"/api/assessments/{demo_asm['id']}/report.pdf")
        self.assertEqual(pdf_download_res.status_code, 200)
        self.assertEqual(pdf_download_res.headers["content-type"], "application/pdf")
        self.assertTrue(pdf_download_res.content.startswith(b"%PDF"))

        # 2. Test Account Ownership Security on PDF Endpoint (User B cannot download User A's PDF)
        reg_a = auth_service.register_user(UserRegisterRequest(full_name="PDF User A", email="pdfuser_a@test.local", password="password123"))
        token_a = reg_a.access_token
        headers_a = {"Authorization": f"Bearer {token_a}"}

        fac_a = client.post("/api/facilities", json={"facility_name": "PDF Factory A", "city": "Rajkot"}, headers=headers_a).json()
        asm_a = client.post("/api/assessments", json={
            "facility_id": fac_a["id"],
            "facility_name": "PDF Factory A",
            "grid_electricity_kwh": 12000.0,
            "virgin_material_kg": 6000.0
        }, headers=headers_a).json()

        reg_b = auth_service.register_user(UserRegisterRequest(full_name="PDF User B", email="pdfuser_b@test.local", password="password123"))
        token_b = reg_b.access_token
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B tries to download User A's PDF report -> 403 Forbidden
        pdf_forbidden_res = client.get(f"/api/assessments/{asm_a['id']}/report.pdf", headers=headers_b)
        self.assertEqual(pdf_forbidden_res.status_code, 403)

        # User A downloads User A's PDF report -> 200 OK
        pdf_ok_res = client.get(f"/api/assessments/{asm_a['id']}/report.pdf", headers=headers_a)
        self.assertEqual(pdf_ok_res.status_code, 200)
        self.assertTrue(pdf_ok_res.content.startswith(b"%PDF"))
        print("[PASS] Test 10: PDF Assessment Report Generation & Ownership Security Passed")

    def assertGreaterThan(self, a, b):
        self.assertTrue(a > b, f"{a} is not > {b}")

    def assertLessThan(self, a, b):
        self.assertTrue(a < b, f"{a} is not < {b}")

if __name__ == '__main__':
    unittest.main()
