"""
What-If Simulator Engine for CarbonLens SME.

Uses explicit mathematical formulas to compute before-and-after operational footprint deltas.

Explicit Formulas:
1. PCR Blend Ratio: Shifts material volume from virgin factor to recycled factor.
   Material CO2e = (Q_mat * (1 - ratio) * EF_virgin) + (Q_mat * ratio * EF_recycled)

2. Renewable Electricity Share: Offsets grid power portion with 0-emission / clean renewable factor.
   Electricity CO2e = Q_elec * (1 - ratio) * EF_grid

3. In-House Regrind / Offsite Recycling: Shifts scrap volume from landfill factor to regrind/recycling factor.
   Scrap CO2e = (Q_scrap * (1 - ratio) * EF_landfill) + (Q_scrap * ratio * EF_recycled)
"""

from typing import Dict, List
from backend.models.schemas import SimulationRequest, SimulationResponse, ProcessInputRequest
from backend.services.emission_engine import calculate_facility_emissions

def run_what_if_simulation(sim_request: SimulationRequest) -> SimulationResponse:
    base_inputs = sim_request.assessment_inputs
    
    # 1. Run baseline calculation
    baseline_result, _ = calculate_facility_emissions(base_inputs)
    baseline_tonnes = baseline_result.total_co2e_tonnes
    before_breakdown = dict(baseline_result.category_breakdown)

    # 2. Extract input quantities
    v_kg = base_inputs.virgin_material_kg or 0.0
    r_kg = base_inputs.recycled_material_kg or 0.0
    tot_mat_kg = v_kg + r_kg
    if tot_mat_kg == 0 and base_inputs.production_output_kg:
        tot_mat_kg = base_inputs.production_output_kg

    elec_kwh = base_inputs.grid_electricity_kwh or 0.0
    landfill_kg = base_inputs.scrap_landfilled_kg or base_inputs.scrap_generated_kg or 0.0

    # Lever parameters
    pcr_ratio = (sim_request.custom_pcr_blend_pct / 100.0) if sim_request.custom_pcr_blend_pct is not None else None
    regrind_ratio = (sim_request.custom_regrind_recovery_pct / 100.0) if sim_request.custom_regrind_recovery_pct is not None else None
    renewable_ratio = (sim_request.custom_renewable_electricity_pct / 100.0) if sim_request.custom_renewable_electricity_pct is not None else None
    efficiency_ratio = (sim_request.custom_energy_efficiency_pct / 100.0) if sim_request.custom_energy_efficiency_pct is not None else None

    # Applied scenario variables
    sim_v_kg = v_kg
    sim_r_kg = r_kg
    sim_elec_kwh = elec_kwh
    sim_landfill_kg = landfill_kg

    applied_levers: List[str] = []
    explanations: List[str] = []
    waste_diverted_kg = 0.0
    fin_savings_inr = 0.0
    has_financials = False

    # A. Material Substitution (PCR Blend Ratio Slider)
    if pcr_ratio is not None and pcr_ratio > 0:
        applied_levers.append(f"{pcr_ratio * 100:.0f}% PCR Resin Blend")
        if tot_mat_kg > 0:
            sim_r_kg = tot_mat_kg * pcr_ratio
            sim_v_kg = max(0.0, tot_mat_kg - sim_r_kg)
            explanations.append(
                f"Shifted {pcr_ratio * 100:.0f}% of total material ({tot_mat_kg:,.0f} kg) to post-consumer recycled resin "
                f"(Virgin: {sim_v_kg:,.0f} kg, Recycled: {sim_r_kg:,.0f} kg)."
            )
            if base_inputs.custom_virgin_cost_inr_per_kg and base_inputs.custom_recycled_cost_inr_per_kg:
                v_cost = base_inputs.custom_virgin_cost_inr_per_kg
                r_cost = base_inputs.custom_recycled_cost_inr_per_kg
                monthly_saved = (v_kg - sim_v_kg) * (v_cost - r_cost)
                fin_savings_inr += monthly_saved * 12.0
                has_financials = True

    # B. In-House Regrind / Scrap Recovery Slider
    if regrind_ratio is not None and regrind_ratio > 0:
        applied_levers.append(f"{regrind_ratio * 100:.0f}% Production Scrap Recovery")
        if landfill_kg > 0:
            diverted = landfill_kg * regrind_ratio
            waste_diverted_kg += diverted
            sim_landfill_kg = max(0.0, landfill_kg - diverted)
            # Offsets virgin polymer purchasing by recovered regrind
            sim_v_kg = max(0.0, sim_v_kg - diverted)
            explanations.append(
                f"Diverted {diverted:,.0f} kg scrap ({regrind_ratio * 100:.0f}% of landfill waste) back into closed-loop production regrind."
            )

    # C. Renewable Electricity Share Slider
    if renewable_ratio is not None and renewable_ratio > 0:
        applied_levers.append(f"{renewable_ratio * 100:.0f}% Renewable Electricity Share")
        if elec_kwh > 0:
            grid_kwh_remaining = elec_kwh * (1.0 - renewable_ratio)
            sim_elec_kwh = grid_kwh_remaining
            explanations.append(
                f"Replaced {renewable_ratio * 100:.0f}% of grid electricity ({elec_kwh * renewable_ratio:,.0f} kWh) with clean solar PV power."
            )
            if base_inputs.custom_electricity_cost_inr_per_kwh:
                tariff = base_inputs.custom_electricity_cost_inr_per_kwh
                monthly_saved = (elec_kwh * renewable_ratio) * (tariff - 3.5)
                fin_savings_inr += monthly_saved * 12.0
                has_financials = True

    # D. Energy Efficiency Slider
    if efficiency_ratio is not None and efficiency_ratio > 0:
        applied_levers.append(f"{efficiency_ratio * 100:.0f}% Energy Efficiency Upgrade")
        if sim_elec_kwh > 0:
            saved_kwh = sim_elec_kwh * efficiency_ratio
            sim_elec_kwh -= saved_kwh
            explanations.append(
                f"Reduced electricity consumption by {efficiency_ratio * 100:.0f}% ({saved_kwh:,.0f} kWh) via drive & thermal efficiency."
            )

    # 3. Create simulated inputs and run calculation backend
    sim_inputs = ProcessInputRequest(
        facility_name=base_inputs.facility_name,
        industry=base_inputs.industry,
        reporting_period=base_inputs.reporting_period,
        city=base_inputs.city,
        polymer_type=base_inputs.polymer_type,
        virgin_material_kg=sim_v_kg,
        recycled_material_kg=sim_r_kg,
        grid_electricity_kwh=sim_elec_kwh,
        diesel_liters=base_inputs.diesel_liters,
        natural_gas_m3=base_inputs.natural_gas_m3,
        production_output_kg=base_inputs.production_output_kg,
        scrap_generated_kg=base_inputs.scrap_generated_kg,
        scrap_recycled_internal_kg=waste_diverted_kg,
        scrap_landfilled_kg=sim_landfill_kg
    )

    sim_result, _ = calculate_facility_emissions(sim_inputs)
    projected_tonnes = sim_result.total_co2e_tonnes
    after_breakdown = dict(sim_result.category_breakdown)

    net_reduction_tonnes = max(0.0, baseline_tonnes - projected_tonnes)
    net_pct = (net_reduction_tonnes / baseline_tonnes * 100.0) if baseline_tonnes > 0 else 0.0

    if has_financials and fin_savings_inr > 0:
        fin_text = f"Estimated operational savings: ₹{fin_savings_inr:,.0f}/year based on user tariff inputs."
    else:
        fin_text = "Financial estimate unavailable (additional tariff & resin purchase cost data required)."

    return SimulationResponse(
        baseline_co2e_tonnes=round(baseline_tonnes, 2),
        projected_co2e_tonnes=round(projected_tonnes, 2),
        net_reduction_tonnes=round(net_reduction_tonnes, 2),
        net_reduction_pct=round(net_pct, 1),
        financial_impact_text=fin_text,
        waste_diverted_tonnes=round(waste_diverted_kg / 1000.0, 2),
        before_breakdown=before_breakdown,
        after_breakdown=after_breakdown,
        applied_levers=applied_levers,
        mathematical_explanation=explanations
    )
