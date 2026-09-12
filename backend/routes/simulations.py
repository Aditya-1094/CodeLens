"""
FastAPI Routes for What-If Scenario Simulations.
Recalculates facility carbon footprint deltas based on explicit mathematical rules.
"""

from fastapi import APIRouter, HTTPException
from backend.models.schemas import SimulationRequest, SimulationResponse
from backend.services.simulation_engine import run_what_if_simulation

router = APIRouter(prefix="/api/simulate", tags=["What-If Simulator"])

@router.post("", response_model=SimulationResponse)
def simulate_scenario(sim_request: SimulationRequest):
    """
    Runs What-If Scenario Calculation:
    Recalculates projected CO2e using explicit mathematical formulas for:
    - Recycled content (PCR blend) ratio
    - In-house regrind recovery rate
    - Renewable electricity solar PV share
    - Energy efficiency upgrades
    """
    try:
        response = run_what_if_simulation(sim_request)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Simulation error: {str(e)}")
