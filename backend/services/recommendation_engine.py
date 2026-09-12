"""
Rule-Based Circular Recommendation Engine for CarbonLens SME.

Matches detected leak points to broader report-aligned recommendation categories:
- Increase recycled material content
- Improve internal production scrap recovery
- Improve energy efficiency
- Evaluate renewable electricity / rooftop solar
- Improve recycling / closed-loop recovery

Financial impact is displayed ONLY if user supplied explicit cost parameters.
Otherwise displays: "Financial estimate unavailable - additional cost data required".
"""

from typing import List
from backend.models.schemas import (
    AssessmentResult, CircularRecommendation, ProcessInputRequest
)
from backend.data.fallback_factors import RECOMMENDATION_RULES

def generate_circular_recommendations(
    assessment: AssessmentResult,
    inputs: ProcessInputRequest
) -> List[CircularRecommendation]:
    
    recommendations: List[CircularRecommendation] = []
    src_map = {s.source_key: s for s in assessment.sources}
    leak_keys = [lp.source_key for lp in assessment.leak_points]
    top_leak_key = leak_keys[0] if leak_keys else ""

    # Stats for calculations
    virgin_src = src_map.get("virgin_polymer")
    recycled_src = src_map.get("recycled_polymer")
    v_kg = virgin_src.activity_amount if virgin_src else 0.0
    r_kg = recycled_src.activity_amount if recycled_src else 0.0
    tot_mat = v_kg + r_kg
    virgin_ratio = (v_kg / tot_mat) if tot_mat > 0 else (1.0 if v_kg > 0 else 0.0)

    elec_src = src_map.get("grid_electricity")
    elec_kwh = elec_src.activity_amount if elec_src else 0.0
    elec_tonnes = elec_src.co2e_tonnes if elec_src else 0.0

    landfill_src = src_map.get("landfill_waste")
    landfill_kg = landfill_src.activity_amount if landfill_src else 0.0

    # User supplied cost data check
    has_mat_cost = (inputs.custom_virgin_cost_inr_per_kg is not None and inputs.custom_recycled_cost_inr_per_kg is not None)
    has_elec_cost = (inputs.custom_electricity_cost_inr_per_kwh is not None)

    for rule in RECOMMENDATION_RULES:
        rule_id = rule["id"]
        triggered = False
        relevance = 50
        savings_tonnes = 0.0
        fin_text = "Financial estimate unavailable (additional cost data required)"

        # 1. Increase Recycled Material Content
        if rule_id == "rec_increase_recycled_content":
            if virgin_ratio >= 0.40 or top_leak_key == "virgin_polymer":
                triggered = True
                relevance = 95 if top_leak_key == "virgin_polymer" else 85
                # 30% substitution shift from virgin to PCR factor (1.93 - 0.58 = 1.35 kgCO2e/kg)
                shift_kg = v_kg * 0.30
                savings_tonnes = (shift_kg * 1.35) / 1000.0

                if has_mat_cost:
                    v_cost = inputs.custom_virgin_cost_inr_per_kg or 0.0
                    r_cost = inputs.custom_recycled_cost_inr_per_kg or 0.0
                    monthly_saved = shift_kg * (v_cost - r_cost)
                    fin_text = f"Est. ₹{monthly_saved:,.0f}/month material cost savings"

        # 2. Improve Internal Production Scrap Recovery
        elif rule_id == "rec_improve_internal_scrap_recovery":
            if landfill_kg > 200 or top_leak_key == "landfill_waste":
                triggered = True
                relevance = 90 if top_leak_key == "landfill_waste" else 80
                # Recovers 70% of landfill scrap into internal regrind (avoids 1.45 kgCO2e/kg landfill)
                recovered_kg = landfill_kg * 0.70
                savings_tonnes = (recovered_kg * 1.45) / 1000.0

                if has_mat_cost:
                    v_cost = inputs.custom_virgin_cost_inr_per_kg or 110.0
                    monthly_saved = recovered_kg * v_cost
                    fin_text = f"Est. ₹{monthly_saved:,.0f}/month raw material offset"

        # 3. Evaluate Renewable Electricity / Rooftop Solar
        elif rule_id == "rec_evaluate_renewable_electricity":
            if elec_kwh >= 10000 or top_leak_key == "grid_electricity":
                triggered = True
                relevance = 95 if top_leak_key == "grid_electricity" else 80
                # 30% solar offset of grid electricity (replaces 0.716 kgCO2e/kWh)
                solar_kwh = elec_kwh * 0.30
                savings_tonnes = (solar_kwh * 0.716) / 1000.0

                if has_elec_cost:
                    tariff = inputs.custom_electricity_cost_inr_per_kwh or 8.5
                    solar_tariff = 3.5 # LCOE benchmark
                    monthly_saved = solar_kwh * (tariff - solar_tariff)
                    fin_text = f"Est. ₹{monthly_saved:,.0f}/month electricity bill reduction"

        # 4. Improve Energy Efficiency
        elif rule_id == "rec_improve_energy_efficiency":
            if elec_kwh >= 8000:
                triggered = True
                relevance = 75
                # 12% energy efficiency improvement
                saved_kwh = elec_kwh * 0.12
                savings_tonnes = (saved_kwh * 0.716) / 1000.0

                if has_elec_cost:
                    tariff = inputs.custom_electricity_cost_inr_per_kwh or 8.5
                    monthly_saved = saved_kwh * tariff
                    fin_text = f"Est. ₹{monthly_saved:,.0f}/month energy bill reduction"

        # 5. Improve Recycling & Offsite Offtake
        elif rule_id == "rec_improve_recycling_recovery":
            if landfill_kg >= 150:
                triggered = True
                relevance = 70
                # Offsite recycling of 80% landfill scrap
                offtake_kg = landfill_kg * 0.80
                savings_tonnes = (offtake_kg * (1.45 - 0.10)) / 1000.0

        if triggered:
            recommendations.append(CircularRecommendation(
                id=rule_id,
                category=rule["category"],
                title=rule["title"],
                subtitle=rule["subtitle"],
                description=rule["description"],
                addresses_hotspot=rule["addresses_hotspot"],
                typical_co2e_reduction_pct=float(rule.get("default_reduction_pct", 25.0)),
                projected_co2e_savings_tonnes=round(savings_tonnes, 2),
                financial_impact_text=fin_text,
                implementation_difficulty=rule["implementation_difficulty"],
                example_technologies=rule["example_technologies"],
                default_sim_lever=rule["default_sim_lever"],
                relevance_score=relevance
            ))

    # Sort recommendations descending by relevance score then savings tonnes
    recommendations.sort(key=lambda r: (r.relevance_score, r.projected_co2e_savings_tonnes), reverse=True)
    return recommendations
