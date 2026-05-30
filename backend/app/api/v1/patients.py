"""Patient intelligence API endpoints."""
from fastapi import APIRouter, HTTPException
from typing import Optional

from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/")
async def list_patients(
    department: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
):
    """List all active patients with optional filtering."""
    state = simulation_service.get_current_state()
    patients = state.get("patients", [])

    if department:
        patients = [p for p in patients if p.get("current_department") == department]
    if severity:
        patients = [p for p in patients if p.get("severity") == severity]

    return {"patients": patients[:limit], "total": len(patients)}

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get a specific patient by ID."""
    state = simulation_service.get_current_state()
    patients = state.get("patients", [])
    patient = next((p for p in patients if p.get("patient_id") == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/{patient_id}/summary")
async def get_patient_summary(patient_id: str):
    """Get AI-generated summary for a patient."""
    state = simulation_service.get_current_state()
    patients = state.get("patients", [])
    patient = next((p for p in patients if p.get("patient_id") == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    summary = await simulation_service.copilot.generate_patient_summary(patient)
    return {"patient_id": patient_id, "summary": summary}

@router.get("/stats/summary")
async def get_patient_stats():
    """Get aggregate patient statistics."""
    state = simulation_service.get_current_state()
    patients = state.get("patients", [])

    severity_counts = {}
    dept_counts = {}
    risk_buckets = {"low": 0, "moderate": 0, "high": 0, "critical": 0}

    for p in patients:
        sev = p.get("severity", "low")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

        dept = p.get("current_department", "unknown")
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

        risk = p.get("risk_score", 0)
        if risk < 0.25:
            risk_buckets["low"] += 1
        elif risk < 0.5:
            risk_buckets["moderate"] += 1
        elif risk < 0.75:
            risk_buckets["high"] += 1
        else:
            risk_buckets["critical"] += 1

    avg_wait = (
        sum(p.get("total_wait_time", 0) for p in patients) / max(1, len(patients))
    )

    return {
        "total_active": len(patients),
        "severity_distribution": severity_counts,
        "department_distribution": dept_counts,
        "risk_distribution": risk_buckets,
        "avg_wait_time": round(avg_wait, 1),
        "metrics": state.get("metrics", {}),
    }
