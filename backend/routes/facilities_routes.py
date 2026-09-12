"""
FastAPI Routes for User Facilities Management.
Enforces strict server-side account ownership & isolation.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from backend.models.schemas import FacilitySetupRequest, FacilityResponse, UserProfile
from backend.services.auth_service import get_current_user
from backend.services.db_repository import db_repository

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])

@router.post("", response_model=FacilityResponse)
def create_facility(
    req: FacilitySetupRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """Creates a user-scoped facility context."""
    try:
        fac = db_repository.create_facility(current_user.id, req.model_dump())
        return fac
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create facility: {str(e)}")

@router.get("", response_model=List[FacilityResponse])
def get_user_facilities(
    current_user: UserProfile = Depends(get_current_user)
):
    """Retrieves facilities owned by the currently authenticated user."""
    return db_repository.get_user_facilities(current_user.id)

@router.get("/{facility_id}", response_model=FacilityResponse)
def get_facility_by_id(
    facility_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retrieves facility by ID.
    Enforces strict server-side account ownership verification.
    """
    fac = db_repository.get_facility(facility_id)
    if not fac:
        raise HTTPException(status_code=404, detail="Facility not found")

    if fac.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Facility belongs to another user account"
        )

    return fac
