"""
Rule-Based Emission Calculation Engine for CarbonLens SME.

Core Formula:
Activity Data × Emission Factor = CO2e

Calculates emissions strictly for supplied user activities using traceable factors.
Excludes missing data categories cleanly without fabricating dummy numbers.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from backend.models.schemas import (
    ProcessInputRequest, AssessmentResult, EmissionSourceDetail, LeakPoint
)
from backend.data.fallback_factors import EMISSION_FACTORS, RECOMMENDATION_RULES
from backend.services.quality_scorer import evaluate_data_quality

def get_emission_factor(category: str, activity_type: str, sub_type: Optional[str] = None) -> Optional[dict]:
    """Helper to retrieve traceable emission factor object."""
    for ef in EMISSION_FACTORS:
        if ef["category"] == category and ef["activity_type"].upper() == activity_type.upper():
            if sub_type is None or ef["sub_type"] == sub_type:
                return ef
    # Fallback search by category and activity_type
    for ef in EMISSION_FACTORS:
        if ef["category"] == category and ef["activity_type"].upper() == activity_type.upper():
            return ef
    return None


def calculate_facility_emissions(inputs: ProcessInputRequest, is_demo: bool = False) -> Tuple[AssessmentResult, List[dict]]:
    """Calculates CO2e for supplied activities and generates structured results."""
    
    # 1. Evaluate Data Quality & Provenance Audit
    quality_breakdown, missing_explanations = evaluate_data_quality(inputs)
    
    polymer = (inputs.polymer_type or "HDPE").upper()
    sources: List[EmissionSourceDetail] = []
    category_totals: Dict[str, float] = {}
    total_co2e_kg = 0.0

    # ----------------------------------------------------
    # A. MATERIALS CALCULATION
    # ----------------------------------------------------
    virgin_kg = inputs.virgin_material_kg
    if virgin_kg is not None and virgin_kg > 0:
        ef_virgin = get_emission_factor("materials", polymer, "virgin") or get_emission_factor("materials", "HDPE", "virgin")
        if ef_virgin:
            co2_kg = virgin_kg * ef_virgin["factor_value"]
            co2_tonnes = co2_kg / 1000.0
            total_co2e_kg += co2_kg
            category_totals["Raw Materials"] = category_totals.get("Raw Materials", 0.0) + co2_tonnes
            
            sources.append(EmissionSourceDetail(
                source_key="virgin_polymer",
                source_name=f"Virgin {polymer} Polymer Feedstock",
                category="Raw Materials",
                activity_amount=round(float(virgin_kg), 2),
                unit="kg",
                emission_factor=float(ef_virgin["factor_value"]),
                factor_unit=ef_virgin["factor_unit"],
                source_reference=f"{ef_virgin['source_organization']} ({ef_virgin['document_reference']})",
                reference_year=ef_virgin["reference_year"],
                co2e_tonnes=round(co2_tonnes, 3),
                percentage=0.0,
                calculation_formula=f"{virgin_kg:,.0f} kg × {ef_virgin['factor_value']} {ef_virgin['factor_unit']} = {co2_kg:,.1f} kgCO2e ({co2_tonnes:.3f} tCO2e)"
            ))

    recycled_kg = inputs.recycled_material_kg
    if recycled_kg is not None and recycled_kg > 0:
        ef_recycled = get_emission_factor("materials", polymer, "recycled") or get_emission_factor("materials", "HDPE", "recycled")
        if ef_recycled:
            co2_kg = recycled_kg * ef_recycled["factor_value"]
            co2_tonnes = co2_kg / 1000.0
            total_co2e_kg += co2_kg
            category_totals["Raw Materials"] = category_totals.get("Raw Materials", 0.0) + co2_tonnes
            
            sources.append(EmissionSourceDetail(
                source_key="recycled_polymer",
                source_name=f"Recycled {polymer} (Post-Consumer PCR)",
                category="Raw Materials",
                activity_amount=round(float(recycled_kg), 2),
                unit="kg",
                emission_factor=float(ef_recycled["factor_value"]),
                factor_unit=ef_recycled["factor_unit"],
                source_reference=f"{ef_recycled['source_organization']} ({ef_recycled['document_reference']})",
                reference_year=ef_recycled["reference_year"],
                co2e_tonnes=round(co2_tonnes, 3),
                percentage=0.0,
                calculation_formula=f"{recycled_kg:,.0f} kg × {ef_recycled['factor_value']} {ef_recycled['factor_unit']} = {co2_kg:,.1f} kgCO2e ({co2_tonnes:.3f} tCO2e)"
            ))

    # ----------------------------------------------------
    # B. ENERGY CALCULATION (Electricity & Fuel)
    # ----------------------------------------------------
    elec_kwh = inputs.grid_electricity_kwh
    if elec_kwh is not None and elec_kwh > 0:
        ef_grid = get_emission_factor("energy", "grid_electricity", "grid")
        if ef_grid:
            co2_kg = elec_kwh * ef_grid["factor_value"]
            co2_tonnes = co2_kg / 1000.0
            total_co2e_kg += co2_kg
            category_totals["Electricity"] = category_totals.get("Electricity", 0.0) + co2_tonnes
            
            sources.append(EmissionSourceDetail(
                source_key="grid_electricity",
                source_name="Indian Grid Electricity",
                category="Electricity",
                activity_amount=round(float(elec_kwh), 2),
                unit="kWh",
                emission_factor=float(ef_grid["factor_value"]),
                factor_unit=ef_grid["factor_unit"],
                source_reference=f"{ef_grid['source_organization']} ({ef_grid['document_reference']})",
                reference_year=ef_grid["reference_year"],
                co2e_tonnes=round(co2_tonnes, 3),
                percentage=0.0,
                calculation_formula=f"{elec_kwh:,.0f} kWh × {ef_grid['factor_value']} {ef_grid['factor_unit']} = {co2_kg:,.1f} kgCO2e ({co2_tonnes:.3f} tCO2e)"
            ))

    diesel_l = inputs.diesel_liters
    if diesel_l is not None and diesel_l > 0:
        ef_diesel = get_emission_factor("energy", "diesel", "fuel")
        if ef_diesel:
            co2_kg = diesel_l * ef_diesel["factor_value"]
            co2_tonnes = co2_kg / 1000.0
            total_co2e_kg += co2_kg
            category_totals["Thermal Energy"] = category_totals.get("Thermal Energy", 0.0) + co2_tonnes
            
            sources.append(EmissionSourceDetail(
                source_key="diesel_fuel",
                source_name="Diesel Fuel (Boilers & Gensets)",
                category="Thermal Energy",
                activity_amount=round(float(diesel_l), 2),
                unit="liter",
                emission_factor=float(ef_diesel["factor_value"]),
                factor_unit=ef_diesel["factor_unit"],
                source_reference=f"{ef_diesel['source_organization']} ({ef_diesel['document_reference']})",
                reference_year=ef_diesel["reference_year"],
                co2e_tonnes=round(co2_tonnes, 3),
                percentage=0.0,
                calculation_formula=f"{diesel_l:,.0f} liters × {ef_diesel['factor_value']} {ef_diesel['factor_unit']} = {co2_kg:,.1f} kgCO2e ({co2_tonnes:.3f} tCO2e)"
            ))

    # ----------------------------------------------------
    # C. WASTE CALCULATION
    # ----------------------------------------------------
    landfill_kg = inputs.scrap_landfilled_kg or inputs.scrap_generated_kg
    if landfill_kg is not None and landfill_kg > 0:
        ef_landfill = get_emission_factor("waste", "landfill", "disposal")
        if ef_landfill:
            co2_kg = landfill_kg * ef_landfill["factor_value"]
            co2_tonnes = co2_kg / 1000.0
            total_co2e_kg += co2_kg
            category_totals["Waste Stream"] = category_totals.get("Waste Stream", 0.0) + co2_tonnes
            
            sources.append(EmissionSourceDetail(
                source_key="landfill_waste",
                source_name="Unsorted Process Scrap to Landfill",
                category="Waste Stream",
                activity_amount=round(float(landfill_kg), 2),
                unit="kg",
                emission_factor=float(ef_landfill["factor_value"]),
                factor_unit=ef_landfill["factor_unit"],
                source_reference=f"{ef_landfill['source_organization']} ({ef_landfill['document_reference']})",
                reference_year=ef_landfill["reference_year"],
                co2e_tonnes=round(co2_tonnes, 3),
                percentage=0.0,
                calculation_formula=f"{landfill_kg:,.0f} kg × {ef_landfill['factor_value']} {ef_landfill['factor_unit']} = {co2_kg:,.1f} kgCO2e ({co2_tonnes:.3f} tCO2e)"
            ))

    total_co2e_tonnes = total_co2e_kg / 1000.0

    # Calculate percentages for sources
    if total_co2e_tonnes > 0:
        for s in sources:
            s.percentage = round((s.co2e_tonnes / total_co2e_tonnes) * 100.0, 1)

    # Sort sources descending by CO2e
    sources.sort(key=lambda s: s.co2e_tonnes, reverse=True)

    # ----------------------------------------------------
    # D. RANKED LEAK-POINTS DETECTION (Top 1 to 3)
    # ----------------------------------------------------
    leak_points: List[LeakPoint] = []
    for idx, s in enumerate(sources[:3]):
        pct = s.percentage
        if pct >= 35.0:
            severity = "High Priority"
        elif pct >= 15.0:
            severity = "Medium Priority"
        else:
            severity = "Low Priority"

        # Root cause explanation
        if "virgin" in s.source_key:
            msg = f"Heavy reliance on virgin polymer feedstock contributes {pct:.1f}% ({s.co2e_tonnes:.2f} tCO2e) due to primary monomer extraction emissions."
        elif "electricity" in s.source_key:
            msg = f"Extruder motor drives and heating load account for {pct:.1f}% ({s.co2e_tonnes:.2f} tCO2e) under coal-intensive grid electricity."
        elif "landfill" in s.source_key:
            msg = f"Unrecovered trim scrap sent to landfill represents {pct:.1f}% ({s.co2e_tonnes:.2f} tCO2e) and direct raw material loss."
        elif "diesel" in s.source_key:
            msg = f"Auxiliary generator fuel combustion accounts for {pct:.1f}% ({s.co2e_tonnes:.2f} tCO2e) of Scope 1 emissions."
        else:
            msg = f"Contributes {pct:.1f}% ({s.co2e_tonnes:.2f} tCO2e) of your calculated footprint."

        leak_points.append(LeakPoint(
            rank=idx + 1,
            source_key=s.source_key,
            source_name=s.source_name,
            category=s.category,
            co2e_tonnes=s.co2e_tonnes,
            percentage=pct,
            severity=severity,
            root_cause_explanation=msg
        ))

    # Round category totals
    rounded_cat_totals = {k: round(v, 3) for k, v in category_totals.items()}

    # Format missing warning
    missing_msg = None
    if quality_breakdown.is_partial_estimate:
        missing_msg = f"PARTIAL ESTIMATE: {len(missing_explanations)} expected activity streams were unrecorded ({', '.join(missing_explanations)})."

    assessment_id = f"asm_{uuid.uuid4().hex[:8]}"

    result = AssessmentResult(
        id=assessment_id,
        facility_name=inputs.facility_name or "SME Manufacturing Facility",
        industry=inputs.industry or "Plastic & Packaging Manufacturing",
        reporting_period=inputs.reporting_period or "Monthly",
        total_co2e_tonnes=round(total_co2e_tonnes, 2),
        is_partial_estimate=quality_breakdown.is_partial_estimate,
        missing_data_warning=missing_msg,
        confidence_breakdown=quality_breakdown,
        sources=sources,
        category_breakdown=rounded_cat_totals,
        leak_points=leak_points,
        recommendations=[], # Filled by recommendation engine
        created_at=datetime.now(timezone.utc),
        is_demo=is_demo
    )

    # Return raw source dicts alongside Pydantic model for database persistence
    raw_sources = [s.model_dump() for s in sources]
    return result, raw_sources
