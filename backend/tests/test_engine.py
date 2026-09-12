"""
Automated Pytest Suite for CarbonLens SME Python Engine.
"""

import pytest
from backend.models.schemas import ProcessInputRequest, SimulationRequest
from backend.services.emission_engine import calculate_facility_emissions
from backend.services.recommendation_engine import generate_circular_recommendations
from backend.services.simulation_engine import run_what_if_simulation
from backend.data.fallback_factors import DEMO_INPUT_PRESET

def test_full_calculation():
    inputs = ProcessInputRequest(**DEMO_INPUT_PRESET)
    result, raw_sources = calculate_facility_emissions(inputs, is_demo=True)
    
    assert result.total_co2e_tonnes > 0
    assert not result.is_partial_estimate
    assert result.confidence_breakdown.confidence_score == 100
    assert len(result.leak_points) > 0
    assert result.leak_points[0].rank == 1
    assert result.leak_points[0].source_key == "virgin_polymer"

def test_incomplete_input():
    inputs = ProcessInputRequest(
        facility_name="Partial Test SME",
        grid_electricity_kwh=20000.0,
        virgin_material_kg=15000.0,
        diesel_liters=None,
        scrap_landfilled_kg=None
    )
    result, _ = calculate_facility_emissions(inputs, is_demo=False)
    
    assert result.is_partial_estimate
    assert result.confidence_breakdown.confidence_score < 100
    assert result.missing_data_warning is not None
    assert "Grid Electricity" in result.category_breakdown
    assert "Raw Materials" in result.category_breakdown
    assert "Thermal Energy" not in result.category_breakdown

def test_material_hotspot():
    inputs = ProcessInputRequest(
        facility_name="Material Heavy SME",
        virgin_material_kg=80000.0,
        grid_electricity_kwh=5000.0
    )
    result, _ = calculate_facility_emissions(inputs)
    assert result.leak_points[0].source_key == "virgin_polymer"
    assert result.leak_points[0].percentage > 50.0

def test_electricity_hotspot():
    inputs = ProcessInputRequest(
        facility_name="Energy Heavy SME",
        virgin_material_kg=2000.0,
        grid_electricity_kwh=100000.0
    )
    result, _ = calculate_facility_emissions(inputs)
    assert result.leak_points[0].source_key == "grid_electricity"
    assert result.leak_points[0].percentage > 50.0

def test_what_if_simulation_math():
    inputs = ProcessInputRequest(**DEMO_INPUT_PRESET)
    sim_req = SimulationRequest(
        assessment_inputs=inputs,
        custom_pcr_blend_pct=30.0,
        custom_regrind_recovery_pct=50.0,
        custom_renewable_electricity_pct=30.0
    )
    sim_res = run_what_if_simulation(sim_req)
    
    assert sim_res.baseline_co2e_tonnes > sim_res.projected_co2e_tonnes
    assert sim_res.net_reduction_tonnes > 0
    assert sim_res.net_reduction_pct > 0
    assert len(sim_res.applied_levers) == 3
