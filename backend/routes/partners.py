"""
FastAPI Routes for Recycler & Vendor Suggestions.
Supports Gujarat-wide location-aware partner discovery with Overpass/Nominatim & curated fallback.
"""

from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
from backend.services.partner_discovery import partner_discovery_service

router = APIRouter(prefix="/api/partners", tags=["Partners"])

@router.get("")
def get_partner_suggestions(
    city: Optional[str] = Query(default="Ahmedabad"),
    state: Optional[str] = Query(default="Gujarat"),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
    material: Optional[str] = Query(default=None)
) -> Dict[str, Any]:
    """
    Returns location-aware recycling partners for Gujarat cities (Surat, Vadodara, Rajkot, Bharuch, Ankleshwar, Vapi, Sanand, Changodar, Morbi, Mehsana, etc.).
    Uses Nominatim for city geocoding and Overpass API for live discovery, falling back to clearly labeled curated prototype data if no live results exist.
    """
    result = partner_discovery_service.discover_partners(
        city=city or "Ahmedabad",
        state=state or "Gujarat",
        lat=lat,
        lng=lng,
        material=material
    )
    return result
