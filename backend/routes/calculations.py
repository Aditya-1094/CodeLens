"""
FastAPI Routes for Traceable Emission Factors & Methodology Audit.
"""

from fastapi import APIRouter
from typing import List, Dict, Any
from backend.services.db_repository import db_repository

router = APIRouter(prefix="/api/factors", tags=["Emission Factors"])

@router.get("", response_model=List[Dict[str, Any]])
def get_emission_factors():
    """Returns list of all traceable emission factors used by CarbonLens SME."""
    return db_repository.get_emission_factors()
