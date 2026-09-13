"""
Database Repository Service for CarbonLens SME.
Integrates with Supabase PostgreSQL and provides user-scoped local fallback storage.
"""

import os
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.config import settings
from backend.data.fallback_factors import (
    EMISSION_FACTORS, RECOMMENDATION_RULES, CURATED_PARTNERS, DEMO_INPUT_PRESET
)

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database"))
FACILITIES_CACHE_FILE = os.path.join(CACHE_DIR, "facilities_cache.json")
ASSESSMENTS_CACHE_FILE = os.path.join(CACHE_DIR, "assessments_cache.json")

def load_cached_json(filepath: str) -> Dict[str, Any]:
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] Failed to load cache file {filepath}: {e}")
    return {}

def save_cached_json(filepath: str, data: Dict[str, Any]):
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"[WARN] Failed to save cache file {filepath}: {e}")

class DatabaseRepository:
    def __init__(self):
        self.supabase_client = None
        if settings.has_supabase:
            try:
                from supabase import create_client
                self.supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                print("[SUCCESS] Connected to Supabase PostgreSQL Database")
            except Exception as e:
                print(f"[WARN] Supabase connection error ({e}). Using local in-memory store.")
                self.supabase_client = None
        else:
            print("[INFO] Supabase credentials not set. Operating in local in-memory fallback mode.")

        # Disk-backed local stores
        self.facilities: Dict[str, Dict[str, Any]] = load_cached_json(FACILITIES_CACHE_FILE)
        self.assessments: Dict[str, Dict[str, Any]] = load_cached_json(ASSESSMENTS_CACHE_FILE)
        self.simulations: Dict[str, Dict[str, Any]] = {}
        self._seed_preseeded_data()

    def get_emission_factors(self) -> List[Dict[str, Any]]:
        if self.supabase_client:
            try:
                res = self.supabase_client.table("emission_factors").select("*").execute()
                if res.data:
                    return res.data
            except Exception:
                pass
        return EMISSION_FACTORS

    def get_recommendation_rules(self) -> List[Dict[str, Any]]:
        if self.supabase_client:
            try:
                res = self.supabase_client.table("recommendation_rules").select("*").execute()
                if res.data:
                    return res.data
            except Exception:
                pass
        return RECOMMENDATION_RULES

    def get_partners(self) -> List[Dict[str, Any]]:
        if self.supabase_client:
            try:
                res = self.supabase_client.table("recyclers_vendors").select("*").execute()
                if res.data:
                    return res.data
            except Exception:
                pass
        return CURATED_PARTNERS

    # --- FACILITY METHODS ---
    def create_facility(self, user_id: str, fac_dict: Dict[str, Any]) -> Dict[str, Any]:
        fac_id = str(uuid.uuid4())
        fac_data = {
            "id": fac_id,
            "user_id": user_id,
            "facility_name": fac_dict["facility_name"],
            "company_name": fac_dict.get("company_name"),
            "industry": fac_dict.get("industry", "Plastic & Packaging Manufacturing"),
            "city": fac_dict["city"],
            "state": fac_dict.get("state", "Gujarat"),
            "country": fac_dict.get("country", "India"),
            "default_reporting_period": fac_dict.get("default_reporting_period", "Monthly"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.facilities[fac_id] = fac_data
        save_cached_json(FACILITIES_CACHE_FILE, self.facilities)

        if self.supabase_client:
            try:
                self.supabase_client.table("facilities").insert(fac_data).execute()
            except Exception as e:
                print(f"[WARN] Supabase facility create warning: {e}")

        return fac_data

    def get_user_facilities(self, user_id: str) -> List[Dict[str, Any]]:
        if self.supabase_client:
            try:
                res = self.supabase_client.table("facilities").select("*").eq("user_id", user_id).execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        user_facs = [f for f in self.facilities.values() if f.get("user_id") == user_id]
        return user_facs

    def get_facility(self, fac_id: str) -> Optional[Dict[str, Any]]:
        if fac_id in self.facilities:
            return self.facilities[fac_id]

        if self.supabase_client:
            try:
                res = self.supabase_client.table("facilities").select("*").eq("id", fac_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        return None

    # --- ASSESSMENT METHODS ---
    def save_assessment(self, result_dict: Dict[str, Any], raw_sources: List[Dict[str, Any]], user_id: Optional[str] = None, facility_id: Optional[str] = None) -> str:
        asm_id = result_dict["id"]
        if user_id:
            result_dict["user_id"] = user_id
        if facility_id:
            result_dict["facility_id"] = facility_id

        self.assessments[asm_id] = {
            "result": result_dict,
            "sources": raw_sources
        }
        save_cached_json(ASSESSMENTS_CACHE_FILE, self.assessments)

        if self.supabase_client:
            try:
                self.supabase_client.table("assessments").insert({
                    "id": asm_id,
                    "user_id": user_id,
                    "facility_id": facility_id,
                    "facility_name": result_dict["facility_name"],
                    "industry": result_dict["industry"],
                    "reporting_period": result_dict["reporting_period"],
                    "total_co2e": result_dict["total_co2e_tonnes"],
                    "confidence_score": result_dict["confidence_breakdown"]["confidence_score"],
                    "is_demo": result_dict.get("is_demo", False),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

                for s in raw_sources:
                    self.supabase_client.table("emission_results").insert({
                        "assessment_id": asm_id,
                        "category": s["category"],
                        "source_name": s["source_name"],
                        "co2e": s["co2e_tonnes"],
                        "percentage_contribution": s["percentage"]
                    }).execute()
            except Exception as e:
                print(f"[WARN] Supabase assessment save warning: {e}")

        return asm_id

    def _seed_preseeded_data(self):
        preseeded_facs = [
            {
                "id": "fac_akshat_vasad_001",
                "user_id": "usr_akshat_001",
                "facility_name": "Akshat Polymers & Packaging Pvt Ltd",
                "company_name": "Akshat Polymers",
                "industry": "Plastic & Packaging Manufacturing",
                "city": "Vasad",
                "state": "Gujarat",
                "country": "India",
                "default_reporting_period": "Monthly (Aug 2026)",
                "created_at": "2026-08-01T00:00:00Z"
            },
            {
                "id": "fac_dhairya_ahmedabad_001",
                "user_id": "usr_dhairya_001",
                "facility_name": "Dhairya Packaging LLP",
                "company_name": "Dhairya Packaging",
                "industry": "Plastic & Packaging Manufacturing",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "country": "India",
                "default_reporting_period": "Monthly (Aug 2026)",
                "created_at": "2026-08-01T00:00:00Z"
            },
            {
                "id": "fac_demo_vatva_001",
                "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                "facility_name": "Vatva Polymer Pack Ltd",
                "company_name": "Vatva Polymer Pack",
                "industry": "Plastic & Packaging Manufacturing",
                "city": "Vatva, Ahmedabad",
                "state": "Gujarat",
                "country": "India",
                "default_reporting_period": "Monthly (Aug 2026)",
                "created_at": "2026-01-01T00:00:00Z"
            }
        ]

        changed_facs = False
        for f in preseeded_facs:
            if f["id"] not in self.facilities:
                self.facilities[f["id"]] = f
                changed_facs = True
        if changed_facs:
            save_cached_json(FACILITIES_CACHE_FILE, self.facilities)

        if "asm_akshat_001" not in self.assessments or "asm_demo_vatva_001" not in self.assessments or "asm_dhairya_001" not in self.assessments:
            try:
                from backend.models.schemas import ProcessInputRequest
                from backend.services.emission_engine import calculate_facility_emissions
                from backend.services.recommendation_engine import generate_circular_recommendations

                # 1. Akshat Assessment
                if "asm_akshat_001" not in self.assessments:
                    akshat_in = ProcessInputRequest(
                        facility_id="fac_akshat_vasad_001",
                        facility_name="Akshat Polymers & Packaging Pvt Ltd",
                        industry="Plastic & Packaging Manufacturing",
                        reporting_period="Monthly (Aug 2026)",
                        city="Vasad",
                        state="Gujarat",
                        country="India",
                        polymer_type="HDPE",
                        virgin_material_kg=38250.0,
                        recycled_material_kg=6750.0,
                        grid_electricity_kwh=35000.0,
                        diesel_liters=280.0,
                        production_output_kg=42000.0,
                        scrap_landfilled_kg=3000.0,
                        custom_virgin_cost_inr_per_kg=92.0,
                        custom_recycled_cost_inr_per_kg=65.0,
                        custom_electricity_cost_inr_per_kwh=8.5
                    )
                    res_a, src_a = calculate_facility_emissions(akshat_in, is_demo=False)
                    res_a.id = "asm_akshat_001"
                    res_a.user_id = "usr_akshat_001"
                    res_a.facility_id = "fac_akshat_vasad_001"
                    res_a.recommendations = generate_circular_recommendations(res_a, akshat_in)
                    self.assessments["asm_akshat_001"] = {"result": res_a.model_dump(), "sources": src_a}

                # 2. Dhairya Assessment
                if "asm_dhairya_001" not in self.assessments:
                    dhairya_in = ProcessInputRequest(
                        facility_id="fac_dhairya_ahmedabad_001",
                        facility_name="Dhairya Packaging LLP",
                        industry="Plastic & Packaging Manufacturing",
                        reporting_period="Monthly (Aug 2026)",
                        city="Ahmedabad",
                        state="Gujarat",
                        country="India",
                        polymer_type="PP",
                        virgin_material_kg=45000.0,
                        recycled_material_kg=5000.0,
                        grid_electricity_kwh=42000.0,
                        diesel_liters=350.0,
                        production_output_kg=48000.0,
                        scrap_landfilled_kg=2000.0
                    )
                    res_d, src_d = calculate_facility_emissions(dhairya_in, is_demo=False)
                    res_d.id = "asm_dhairya_001"
                    res_d.user_id = "usr_dhairya_001"
                    res_d.facility_id = "fac_dhairya_ahmedabad_001"
                    res_d.recommendations = generate_circular_recommendations(res_d, dhairya_in)
                    self.assessments["asm_dhairya_001"] = {"result": res_d.model_dump(), "sources": src_d}

                # 3. Demo Assessment
                if "asm_demo_vatva_001" not in self.assessments:
                    demo_in = ProcessInputRequest(**DEMO_INPUT_PRESET)
                    res_dm, src_dm = calculate_facility_emissions(demo_in, is_demo=True)
                    res_dm.id = "asm_demo_vatva_001"
                    res_dm.user_id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
                    res_dm.facility_id = "fac_demo_vatva_001"
                    res_dm.recommendations = generate_circular_recommendations(res_dm, demo_in)
                    self.assessments["asm_demo_vatva_001"] = {"result": res_dm.model_dump(), "sources": src_dm}

                save_cached_json(ASSESSMENTS_CACHE_FILE, self.assessments)
            except Exception as e:
                print(f"[WARN] Error pre-seeding default assessments: {e}")

    def get_user_assessments(self, user_id: str, facility_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # Special check for demo user
        if user_id == "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11":
            if "asm_demo_vatva_001" in self.assessments:
                val = self.assessments["asm_demo_vatva_001"]
                return [val.get("result", val)]

        if self.supabase_client:
            try:
                query = self.supabase_client.table("assessments").select("*").eq("user_id", user_id)
                if facility_id:
                    query = query.eq("facility_id", facility_id)
                res = query.order("created_at", desc=True).execute()
                if res.data:
                    results = []
                    for item in res.data:
                        fetched = self.get_assessment(item["id"])
                        if fetched:
                            results.append(fetched)
                    if results:
                        return results
            except Exception:
                pass

        user_asms = []
        for val in self.assessments.values():
            res_dict = val.get("result", val) if isinstance(val, dict) else val
            if isinstance(res_dict, dict) and res_dict.get("user_id") == user_id:
                user_asms.append(res_dict)

        if facility_id:
            matched_fac = [a for a in user_asms if a.get("facility_id") == facility_id]
            if matched_fac:
                matched_fac.sort(key=lambda a: str(a.get("created_at", "")), reverse=True)
                return matched_fac
        
        user_asms.sort(key=lambda a: str(a.get("created_at", "")), reverse=True)
        return user_asms

    def get_latest_user_assessment(self, user_id: str, facility_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        asms = self.get_user_assessments(user_id, facility_id=facility_id)
        return asms[0] if asms else None

    def get_assessment(self, asm_id: str) -> Optional[Dict[str, Any]]:
        if asm_id in self.assessments:
            val = self.assessments[asm_id]
            return val.get("result", val) if isinstance(val, dict) else val

        if self.supabase_client:
            try:
                res = self.supabase_client.table("assessments").select("*").eq("id", asm_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        return None

db_repository = DatabaseRepository()
