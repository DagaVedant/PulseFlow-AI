"""Care coordination API endpoints: specialist roster, fixed bottleneck constraints, tracked patients, and constraint-aware recommendations."""
from fastapi import APIRouter, HTTPException, Body

from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/care", tags=["care"])

@router.get("/state")
async def get_care_state():
    """Specialists, fixed bottlenecks, and tracked executive patients with live countdowns."""
    return simulation_service.care.get_state(simulation_service.simulation.sim_time)

@router.get("/recommendations")
async def get_care_recommendations():
    """Constraint-aware per-patient care recommendations with operational reasoning."""
    return {"recommendations": simulation_service.get_care_recommendations()}

@router.get("/specialists")
async def list_specialists():
    """The full specialist roster with availability."""
    return {"specialists": simulation_service.care.get_state(simulation_service.simulation.sim_time)["specialists"]}

@router.get("/bottlenecks")
async def list_bottlenecks():
    """All active fixed operational constraints."""
    return {"bottlenecks": simulation_service.care.get_state(simulation_service.simulation.sim_time)["bottlenecks"]}

@router.post("/bottlenecks")
async def add_bottleneck(data: dict = Body(...)):
    """Register a fixed, non-movable operational constraint."""
    return simulation_service.add_bottleneck(data)

@router.delete("/bottlenecks/{bottleneck_id}")
async def remove_bottleneck(bottleneck_id: str):
    """Remove a fixed constraint."""
    ok = simulation_service.remove_bottleneck(bottleneck_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Bottleneck not found")
    return {"removed": bottleneck_id}

@router.get("/patients/{patient_id}/summary")
async def get_tracked_patient_summary(patient_id: str):
    """AI-generated clinical summary for a tracked executive patient."""
    result = await simulation_service.get_tracked_patient_summary(patient_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tracked patient not found")
    return result
