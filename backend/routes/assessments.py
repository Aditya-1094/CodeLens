"""
FastAPI Routes for CarbonLens SME Assessments.
Enforces strict server-side account ownership & relational isolation.
Adds server-side PDF Assessment Report export endpoint.
"""

import re
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends, Response, status


from backend.models.schemas import ProcessInputRequest, AssessmentResult, UserProfile
from backend.services.emission_engine import calculate_facility_emissions
from backend.services.recommendation_engine import generate_circular_recommendations
from backend.services.db_repository import db_repository
from backend.services.auth_service import get_current_user, get_current_user_optional, verify_auth_token
from backend.services.pdf_generator import pdf_generator
from backend.data.fallback_factors import DEMO_INPUT_PRESET

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


@router.post("", response_model=AssessmentResult)
def create_assessment(
    inputs: ProcessInputRequest,
    current_user: Optional[UserProfile] = Depends(get_current_user_optional)
):
    """
    Submits factory operational input data to Python backend calculation engine:
    - Server-side attaches authenticated user_id from verified token.
    - Persists assessment and returns calculated results.
    """
    try:
        result, raw_sources = calculate_facility_emissions(inputs, is_demo=False)
        recs = generate_circular_recommendations(result, inputs)
        result.recommendations = recs
        
        user_id = current_user.id if current_user else None
        facility_id = inputs.facility_id

        db_repository.save_assessment(result.model_dump(), raw_sources, user_id=user_id, facility_id=facility_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation engine error: {str(e)}")


@router.get("/user/latest", response_model=Optional[AssessmentResult])
def get_latest_user_assessment(
    facility_id: Optional[str] = Query(default=None),
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retrieves the latest saved assessment for the authenticated user and facility.
    """
    asm = db_repository.get_latest_user_assessment(current_user.id, facility_id=facility_id)
    if not asm:
        return None
    return asm


@router.get("/user/history", response_model=List[AssessmentResult])
def get_user_assessment_history(
    facility_id: Optional[str] = Query(default=None),
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retrieves history of all saved assessments for the authenticated user and facility.
    """
    return db_repository.get_user_assessments(current_user.id, facility_id=facility_id)




@router.get("/demo/load", response_model=AssessmentResult)
def load_hackathon_demo():
    """
    Loads 1-Click Hackathon Demo Mode:
    Feeds preset DEMO INPUTS (Vatva Polymer Pack Ltd) into calculation engine.
    Clearly marked with is_demo=True.
    """
    try:
        demo_inputs = ProcessInputRequest(**DEMO_INPUT_PRESET)
        result, raw_sources = calculate_facility_emissions(demo_inputs, is_demo=True)
        recs = generate_circular_recommendations(result, demo_inputs)
        result.recommendations = recs

        db_repository.save_assessment(result.model_dump(), raw_sources)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demo mode loading error: {str(e)}")


@router.get("/{assessment_id}/report.pdf")
def download_assessment_pdf(
    assessment_id: str,
    token: Optional[str] = Query(default=None),
    current_user: Optional[UserProfile] = Depends(get_current_user_optional)
):
    """
    Generates and downloads publication-grade PDF Assessment Report.
    Strictly verifies ownership & returns exact calculated assessment figures.
    """
    user = current_user
    if not user and token:
        user = verify_auth_token(token)

    asm = db_repository.get_assessment(assessment_id)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment record not found")

    is_demo = asm.get("is_demo", False)

    # Ownership Security Check
    if not is_demo:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required to download assessment PDF"
            )
        asm_user_id = asm.get("user_id")
        if asm_user_id and asm_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Cannot download another facility's assessment report"
            )

    # Fetch facility info if available
    facility = None
    fac_id = asm.get("facility_id")
    if fac_id:
        facility = db_repository.facilities.get(fac_id)

    pdf_bytes = pdf_generator.generate_pdf(asm, facility=facility)

    raw_name = asm.get("facility_name") or "Facility"
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_name)
    raw_created = asm.get("created_at")
    date_str = raw_created.strftime("%Y-%m-%d") if hasattr(raw_created, "strftime") else (str(raw_created)[:10] if raw_created else "Report")
    filename = f"CarbonLens_Assessment_{clean_name}_{date_str}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Cache-Control": "no-cache"
        }
    )


@router.get("/{assessment_id}", response_model=AssessmentResult)
def get_assessment(
    assessment_id: str,
    current_user: Optional[UserProfile] = Depends(get_current_user_optional)
):
    """
    Retrieves saved assessment by ID.
    Enforces strict server-side account ownership verification.
    """
    asm = db_repository.get_assessment(assessment_id)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment ID not found")

    if asm.get("is_demo", False):
        return asm

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access private facility assessment"
        )

    asm_user_id = asm.get("user_id")
    if asm_user_id and asm_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Assessment belongs to another facility account"
        )

    return asm
