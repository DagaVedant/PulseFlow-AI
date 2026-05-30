"""Department status and metrics API endpoints."""
from fastapi import APIRouter, HTTPException
from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/departments", tags=["departments"])

@router.get("/")
async def list_departments():
    """Get status of all hospital departments."""
    state = simulation_service.get_current_state()
    return {"departments": state.get("departments", {})}

@router.get("/{dept_id}")
async def get_department(dept_id: str):
    """Get detailed status of a specific department."""
    state = simulation_service.get_current_state()
    depts = state.get("departments", {})
    if dept_id not in depts:
        raise HTTPException(status_code=404, detail=f"Department '{dept_id}' not found")
    return depts[dept_id]

@router.get("/{dept_id}/queue")
async def get_department_queue(dept_id: str):
    """Get queued patients for a specific department."""
    state = simulation_service.get_current_state()
    depts = state.get("departments", {})
    if dept_id not in depts:
        raise HTTPException(status_code=404, detail=f"Department '{dept_id}' not found")

    dept = depts[dept_id]
    queued_ids = dept.get("patients_queued", [])
    all_patients = {p["patient_id"]: p for p in state.get("patients", [])}

    queued = [all_patients[pid] for pid in queued_ids if pid in all_patients]
    return {
        "department": dept_id,
        "queue_length": dept.get("queue_length", 0),
        "queued_patients": queued,
    }
