"""
Rule-Based Data Quality & Confidence Scoring Engine.

Evaluates completeness of user-supplied activity data:
- Calculates ONLY data actually supplied by the user.
- If expected data is missing, marks the assessment as a PARTIAL ESTIMATE.
- Penalizes the confidence score deterministically.
- Generates a transparent audit breakdown explaining supplied vs. missing data.
"""

from typing import Tuple, List
from backend.models.schemas import ProcessInputRequest, DataQualityBreakdown, FieldProvenance

def evaluate_data_quality(inputs: ProcessInputRequest) -> Tuple[DataQualityBreakdown, List[str]]:
    audit_trail: List[FieldProvenance] = []
    missing_explanations: List[str] = []
    
    score = 0
    supplied_count = 0
    missing_count = 0

    # 1. Electricity (Weight: 30 points)
    if inputs.grid_electricity_kwh is not None and inputs.grid_electricity_kwh > 0:
        score += 30
        supplied_count += 1
        audit_trail.append(FieldProvenance(
            field_name="Grid Electricity",
            status="Metered / Supplied",
            value=float(inputs.grid_electricity_kwh),
            unit="kWh",
            is_supplied=True,
            notes="Electricity utility consumption record"
        ))
    else:
        missing_count += 1
        missing_explanations.append("Grid electricity consumption data unavailable")
        audit_trail.append(FieldProvenance(
            field_name="Grid Electricity",
            status="Data Unavailable",
            value=None,
            unit="kWh",
            is_supplied=False,
            notes="Excluded from calculations"
        ))

    # 2. Materials - Virgin Resin (Weight: 25 points)
    if inputs.virgin_material_kg is not None and inputs.virgin_material_kg > 0:
        score += 25
        supplied_count += 1
        audit_trail.append(FieldProvenance(
            field_name="Virgin Polymer Resin",
            status="Supplied / Invoiced",
            value=float(inputs.virgin_material_kg),
            unit="kg",
            is_supplied=True,
            notes=f"Primary resin input ({inputs.polymer_type or 'HDPE'})"
        ))
    else:
        missing_count += 1
        missing_explanations.append("Virgin polymer resin procurement data unavailable")
        audit_trail.append(FieldProvenance(
            field_name="Virgin Polymer Resin",
            status="Data Unavailable",
            value=None,
            unit="kg",
            is_supplied=False,
            notes="Excluded from calculations"
        ))

    # 3. Materials - Recycled Resin Split (Weight: 15 points)
    if inputs.recycled_material_kg is not None:
        score += 15
        supplied_count += 1
        audit_trail.append(FieldProvenance(
            field_name="Recycled Polymer (PCR)",
            status="Supplied",
            value=float(inputs.recycled_material_kg),
            unit="kg",
            is_supplied=True,
            notes="Post-consumer recycled polymer blend"
        ))
    else:
        missing_count += 1
        missing_explanations.append("Recycled polymer (PCR) blend ratio unrecorded")
        audit_trail.append(FieldProvenance(
            field_name="Recycled Polymer (PCR)",
            status="Unrecorded",
            value=0.0,
            unit="kg",
            is_supplied=False,
            notes="Assumed 0 kg recycled material"
        ))

    # 4. Production Output (Weight: 15 points)
    if inputs.production_output_kg is not None and inputs.production_output_kg > 0:
        score += 15
        supplied_count += 1
        audit_trail.append(FieldProvenance(
            field_name="Finished Goods Output",
            status="Supplied",
            value=float(inputs.production_output_kg),
            unit="kg",
            is_supplied=True,
            notes="Monthly finished product production log"
        ))
    else:
        missing_count += 1
        missing_explanations.append("Finished goods production output unavailable")
        audit_trail.append(FieldProvenance(
            field_name="Finished Goods Output",
            status="Data Unavailable",
            value=None,
            unit="kg",
            is_supplied=False,
            notes="Used for process context only"
        ))

    # 5. Waste & Scrap Stream (Weight: 15 points)
    if inputs.scrap_landfilled_kg is not None or inputs.scrap_generated_kg is not None:
        score += 15
        supplied_count += 1
        waste_val = inputs.scrap_landfilled_kg or inputs.scrap_generated_kg or 0.0
        audit_trail.append(FieldProvenance(
            field_name="Process Scrap & Landfill Waste",
            status="Supplied",
            value=float(waste_val),
            unit="kg",
            is_supplied=True,
            notes="Process trim scrap and waste stream"
        ))
    else:
        missing_count += 1
        missing_explanations.append("Waste disposal & scrap stream data unavailable")
        audit_trail.append(FieldProvenance(
            field_name="Process Scrap & Landfill Waste",
            status="Data Unavailable",
            value=None,
            unit="kg",
            is_supplied=False,
            notes="Excluded from calculations"
        ))

    is_partial = missing_count > 0
    
    if score >= 85:
        badge = "High Confidence (Complete Data)"
    elif score >= 60:
        badge = "Good Confidence (Minor Gaps)"
    elif score >= 35:
        badge = "PARTIAL ESTIMATE (Limited Data)"
    else:
        badge = "PARTIAL ESTIMATE (Minimal Data)"

    breakdown = DataQualityBreakdown(
        confidence_score=score,
        quality_badge=badge,
        supplied_count=supplied_count,
        missing_count=missing_count,
        is_partial_estimate=is_partial,
        audit_trail=audit_trail,
        missing_fields_explanation=missing_explanations
    )

    return breakdown, missing_explanations
