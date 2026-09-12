"""
Database Repository Service for CarbonLens SME.
Integrates with Supabase PostgreSQL and provides user-scoped local fallback storage.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.config import settings
from backend.data.fallback_factors import (
    EMISSION_FACTORS, RECOMMENDATION_RULES, CURATED_PARTNERS, DEMO_INPUT_PRESET
)

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

        # Local in-memory stores
        self.facilities: Dict[str, Dict[str, Any]] = {}
        self.assessments: Dict[str, Dict[str, Any]] = {}
        self.simulations: Dict[str, Dict[str, Any]] = {}

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

        user_facs = [f for f in self.facilities.values() if f["user_id"] == user_id]
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

    def get_latest_user_assessment(self, user_id: str, facility_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if self.supabase_client:
            try:
                query = self.supabase_client.table("assessments").select("*").eq("user_id", user_id)
                if facility_id:
                    query = query.eq("facility_id", facility_id)
                res = query.order("created_at", desc=True).limit(1).execute()
                if res.data:
                    asm_id = res.data[0]["id"]
                    return self.get_assessment(asm_id)
            except Exception:
                pass

        user_asms = [a["result"] for a in self.assessments.values() if a["result"].get("user_id") == user_id]
        if facility_id:
            user_asms = [a for a in user_asms if a.get("facility_id") == facility_id]
        
        if user_asms:
            user_asms.sort(key=lambda a: a.get("created_at", ""), reverse=True)
            return user_asms[0]

        return None

    def get_assessment(self, asm_id: str) -> Optional[Dict[str, Any]]:
        if asm_id in self.assessments:
            return self.assessments[asm_id]["result"]

        if self.supabase_client:
            try:
                res = self.supabase_client.table("assessments").select("*").eq("id", asm_id).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        return None

db_repository = DatabaseRepository()
