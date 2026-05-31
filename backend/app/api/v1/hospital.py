"""Hospital data API — patients and departments endpoints, consolidated."""
from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.service import simulation_service

router = APIRouter(prefix="/hospital", tags=["hospital"])

# ─── Patients ────────────────────────────────────────────────────────────────

@router.get("/patients")
async def list_patients(department: Optional[str] = None, severity: Optional[str] = None, limit: int = 50):
    state = simulation_service.get_current_state()
    patients = state.get("patients", [])
    if department:
        patients = [p for p in patients if p.get("current_department") == department]
    if severity:
        patients = [p for p in patients if p.get("severity") == severity]
    return {"patients": patients[:limit], "total": len(patients)}

@router.get("/patients/stats")
async def get_patient_stats():
    state    = simulation_service.get_current_state()
    patients = state.get("patients", [])
    severity_counts: dict = {}
    dept_counts: dict     = {}
    risk_buckets = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    for p in patients:
        sev  = p.get("severity", "low")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        dept = p.get("current_department", "unknown")
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
        risk = p.get("risk_score", 0)
        bucket = "critical" if risk >= 0.75 else ("high" if risk >= 0.5 else ("moderate" if risk >= 0.25 else "low"))
        risk_buckets[bucket] += 1
    avg_wait = sum(p.get("total_wait_time", 0) for p in patients) / max(1, len(patients))
    return {"total_active": len(patients), "severity_distribution": severity_counts,
            "department_distribution": dept_counts, "risk_distribution": risk_buckets,
            "avg_wait_time": round(avg_wait, 1), "metrics": state.get("metrics", {})}

@router.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    state    = simulation_service.get_current_state()
    patients = state.get("patients", [])
    patient  = next((p for p in patients if p.get("patient_id") == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/patients/{patient_id}/summary")
async def get_patient_summary(patient_id: str):
    state    = simulation_service.get_current_state()
    patients = state.get("patients", [])
    patient  = next((p for p in patients if p.get("patient_id") == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    summary = await simulation_service.copilot.generate_patient_summary(patient)
    return {"patient_id": patient_id, "summary": summary}

# ─── Departments ─────────────────────────────────────────────────────────────

@router.get("/departments")
async def list_departments():
    state = simulation_service.get_current_state()
    return {"departments": state.get("departments", {})}

@router.get("/departments/{dept_id}")
async def get_department(dept_id: str):
    state = simulation_service.get_current_state()
    depts = state.get("departments", {})
    if dept_id not in depts:
        raise HTTPException(status_code=404, detail=f"Department '{dept_id}' not found")
    return depts[dept_id]

@router.get("/departments/{dept_id}/queue")
async def get_department_queue(dept_id: str):
    state = simulation_service.get_current_state()
    depts = state.get("departments", {})
    if dept_id not in depts:
        raise HTTPException(status_code=404, detail=f"Department '{dept_id}' not found")
    dept       = depts[dept_id]
    queued_ids = dept.get("patients_queued", [])
    all_pts    = {p["patient_id"]: p for p in state.get("patients", [])}
    queued     = [all_pts[pid] for pid in queued_ids if pid in all_pts]
    return {"department": dept_id, "queue_length": dept.get("queue_length", 0), "queued_patients": queued}
