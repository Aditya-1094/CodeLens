"""
Pydantic Schemas for CarbonLens SME.
Defines data structures for Auth, Profiles, Facilities, Process Inputs, Assessments, Leak Points, Recommendations, Simulations, and Vendors.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Optional, Any
from datetime import datetime

# ----------------------------------------------------
# AUTH & PROFILE SCHEMAS
# ----------------------------------------------------
class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., description="Full name of the user")
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=6, description="Password")

class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")

class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    created_at: Optional[datetime] = None

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    facility: Optional[Dict[str, Any]] = None
    requires_email_confirmation: bool = False
    message: Optional[str] = None

# ----------------------------------------------------
# FACILITY SCHEMAS
# ----------------------------------------------------
class FacilitySetupRequest(BaseModel):
    facility_name: str = Field(..., description="Name of the manufacturing facility")
    company_name: Optional[str] = Field(default=None, description="Company/Parent business name")
    industry: str = Field(default="Plastic & Packaging Manufacturing", description="Industry sector")
    city: str = Field(..., description="City location")
    state: Optional[str] = Field(default="Gujarat", description="State location")
    country: Optional[str] = Field(default="India", description="Country location")
    default_reporting_period: str = Field(default="Monthly", description="Default reporting period")

class FacilityResponse(BaseModel):
    id: str
    user_id: str
    facility_name: str
    company_name: Optional[str] = None
    industry: str
    city: str
    state: Optional[str] = None
    country: Optional[str] = "India"
    default_reporting_period: str = "Monthly"
    created_at: Optional[datetime] = None

# ----------------------------------------------------
# ASSESSMENT SCHEMAS
# ----------------------------------------------------
class ProcessInputRequest(BaseModel):
    facility_id: Optional[str] = Field(default=None, description="Facility ID if assigned")
    facility_name: Optional[str] = Field(default="Apex Plastics SME", description="Name of the manufacturing facility")
    industry: Optional[str] = Field(default="Plastic & Packaging Manufacturing", description="Industry sector")
    reporting_period: Optional[str] = Field(default="Monthly (Aug 2026)", description="Reporting timeframe")
    city: Optional[str] = Field(default="Ahmedabad", description="City location")
    polymer_type: Optional[str] = Field(default="HDPE", description="Primary polymer type: HDPE, LDPE, PP, PET")

    # Materials
    virgin_material_kg: Optional[float] = Field(default=None, description="Monthly virgin polymer resin input in kg")
    recycled_material_kg: Optional[float] = Field(default=None, description="Monthly post-consumer recycled polymer input in kg")

    # Energy
    grid_electricity_kwh: Optional[float] = Field(default=None, description="Monthly grid electricity in kWh")
    diesel_liters: Optional[float] = Field(default=None, description="Monthly diesel consumption in liters")
    natural_gas_m3: Optional[float] = Field(default=None, description="Monthly natural gas in m3")

    # Production
    production_output_kg: Optional[float] = Field(default=None, description="Monthly finished product output in kg")

    # Waste
    scrap_generated_kg: Optional[float] = Field(default=None, description="Monthly production scrap generated in kg")
    scrap_recycled_internal_kg: Optional[float] = Field(default=None, description="Monthly scrap reground/recycled internally in kg")
    scrap_landfilled_kg: Optional[float] = Field(default=None, description="Monthly plastic scrap sent to landfill in kg")

    # Optional Cost Data supplied by SME
    custom_virgin_cost_inr_per_kg: Optional[float] = Field(default=None, description="SME virgin polymer cost per kg")
    custom_recycled_cost_inr_per_kg: Optional[float] = Field(default=None, description="SME recycled polymer cost per kg")
    custom_electricity_cost_inr_per_kwh: Optional[float] = Field(default=None, description="SME electricity tariff per kWh")


class FieldProvenance(BaseModel):
    field_name: str
    status: str
    value: Optional[float] = None
    unit: Optional[str] = None
    is_supplied: bool = True
    notes: Optional[str] = None


class DataQualityBreakdown(BaseModel):
    confidence_score: int
    quality_badge: str
    supplied_count: int
    missing_count: int
    is_partial_estimate: bool
    audit_trail: List[FieldProvenance]
    missing_fields_explanation: List[str]


class EmissionSourceDetail(BaseModel):
    source_key: str
    source_name: str
    category: str
    activity_amount: float
    unit: str
    emission_factor: float
    factor_unit: str
    source_reference: str
    reference_year: int
    co2e_tonnes: float
    percentage: float
    calculation_formula: str


class LeakPoint(BaseModel):
    rank: int
    source_key: str
    source_name: str
    category: str
    co2e_tonnes: float
    percentage: float
    severity: str
    root_cause_explanation: str


class CircularRecommendation(BaseModel):
    id: str
    category: str
    title: str
    subtitle: str
    description: str
    addresses_hotspot: str
    typical_co2e_reduction_pct: float
    projected_co2e_savings_tonnes: float
    financial_impact_text: str
    implementation_difficulty: str
    example_technologies: str
    default_sim_lever: str
    relevance_score: int


class AssessmentResult(BaseModel):
    id: str
    user_id: Optional[str] = None
    facility_id: Optional[str] = None
    facility_name: str
    industry: str
    reporting_period: str
    total_co2e_tonnes: float
    is_partial_estimate: bool
    missing_data_warning: Optional[str] = None
    confidence_breakdown: DataQualityBreakdown
    sources: List[EmissionSourceDetail]
    category_breakdown: Dict[str, float]
    leak_points: List[LeakPoint]
    recommendations: List[CircularRecommendation]
    created_at: datetime
    is_demo: bool = False
    input_snapshot: Optional[Dict[str, Any]] = None


class SimulationRequest(BaseModel):
    assessment_inputs: ProcessInputRequest
    selected_recommendation_ids: Optional[List[str]] = []
    custom_pcr_blend_pct: Optional[float] = None
    custom_regrind_recovery_pct: Optional[float] = None
    custom_renewable_electricity_pct: Optional[float] = None
    custom_energy_efficiency_pct: Optional[float] = None


class SimulationResponse(BaseModel):
    baseline_co2e_tonnes: float
    projected_co2e_tonnes: float
    net_reduction_tonnes: float
    net_reduction_pct: float
    financial_impact_text: str
    waste_diverted_tonnes: float
    before_breakdown: Dict[str, float]
    after_breakdown: Dict[str, float]
    applied_levers: List[str]
    mathematical_explanation: List[str]


class PartnerVendor(BaseModel):
    id: str
    name: str
    partner_type: str
    materials_supported: List[str]
    location: str
    distance_km: float
    contact_info: str
    notes: str
    is_demo: bool = True
