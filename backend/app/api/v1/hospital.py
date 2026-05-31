"""Hospital data API — patients and departments endpoints, consolidated."""
from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.service import simulation_service

router = APIRouter(prefix="/hospital", tags=["hospital"])

# ─── Patients ────────────────────────────────────────────────────────────────

@router.get("/patients")
async def list_patients(department: Optional[str] = None, severity: Optional[str] = None, limit: int = 50):
    """
    Returns a filtered list of currently active patients in the simulation.

    Parameters:
        department: Optional string to filter patients by department name
                    (e.g. "er", "icu", "ward").  Returns all departments if
                    omitted.
        severity:   Optional string to filter by severity level ("low",
                    "medium", "high", or "critical").  Returns all severities
                    if omitted.
        limit:      Maximum number of patients to return.  Defaults to 50.

    Returns a JSON object with a "patients" list and a "total" count before
    the limit was applied.

    REST endpoint: GET /api/v1/hospital/patients
    """
    state = simulation_service.get_current_state()
    patients = state.get("patients", [])
    if department:
        patients = [p for p in patients if p.get("current_department") == department]
    if severity:
        patients = [p for p in patients if p.get("severity") == severity]
    return {"patients": patients[:limit], "total": len(patients)}

@router.get("/patients/stats")
async def get_patient_stats():
    """
    Computes and returns summary statistics across all active patients,
    including breakdowns by severity, department, and risk score bucket.

    No query parameters.

    Returns a JSON object with: total_active patient count,
    severity_distribution (counts per level), department_distribution
    (counts per department), risk_distribution (low/moderate/high/critical
    buckets), avg_wait_time in simulated minutes, and the raw metrics dict
    from the simulation state.

    REST endpoint: GET /api/v1/hospital/patients/stats
    """
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
    """
    Looks up a single patient by their unique ID and returns all their data.

    Parameters:
        patient_id: The short alphanumeric ID string (e.g. "A3F2B1C9")
                    taken from the URL path.

    Returns the patient dict for that ID, or raises HTTP 404 if the patient
    is not found among the currently active patients.

    REST endpoint: GET /api/v1/hospital/patients/{patient_id}
    """
    state    = simulation_service.get_current_state()
    patients = state.get("patients", [])
    patient  = next((p for p in patients if p.get("patient_id") == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/patients/{patient_id}/summary")
async def get_patient_summary(patient_id: str):
    """
    Generates an AI-written clinical narrative summary for a specific
    patient by passing their data to the Anthropic copilot model.

    Parameters:
        patient_id: The short alphanumeric ID string of the patient,
                    taken from the URL path.

    Returns a JSON object with "patient_id" and "summary" (a plain-English
    paragraph describing the patient's condition and care status), or raises
    HTTP 404 if the patient is not found.

    REST endpoint: GET /api/v1/hospital/patients/{patient_id}/summary
    """
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
    """
    Returns the full departments dictionary from the current simulation
    state, containing occupancy, capacity, queue lengths, and resource
    utilisation for every department.

    No query parameters.

    Returns a JSON object with a "departments" key whose value is a dict
    keyed by department name (e.g. "er", "icu").

    REST endpoint: GET /api/v1/hospital/departments
    """
    state = simulation_service.get_current_state()
    return {"departments": state.get("departments", {})}

@router.get("/departments/{dept_id}")
async def get_department(dept_id: str):
    """
    Returns the current state data for one specific hospital department.

    Parameters:
        dept_id: The department identifier string (e.g. "er", "icu", "labs",
                 "imaging", "ward") taken from the URL path.

    Returns the department's state dict, or raises HTTP 404 if the
    department name is not recognised.

    REST endpoint: GET /api/v1/hospital/departments/{dept_id}
    """
    state = simulation_service.get_current_state()
    depts = state.get("departments", {})
    if dept_id not in depts:
        raise HTTPException(status_code=404, detail=f"Department '{dept_id}' not found")
    return depts[dept_id]

@router.get("/departments/{dept_id}/queue")
async def get_department_queue(dept_id: str):
    """
    Returns the current waiting queue for a specific department, including
    the full patient data for each patient currently queued there.

    Parameters:
        dept_id: The department identifier string (e.g. "er", "icu")
                 taken from the URL path.

    Returns a JSON object with "department" (the dept_id echo), "queue_length"
    (integer count), and "queued_patients" (list of patient dicts in queue
    order).  Raises HTTP 404 if the department is not found.

    REST endpoint: GET /api/v1/hospital/departments/{dept_id}/queue
    """
    state = simulation_service.get_current_state()
    depts = state.get("departments", {})
    if dept_id not in depts:
        raise HTTPException(status_code=404, detail=f"Department '{dept_id}' not found")
    dept       = depts[dept_id]
    queued_ids = dept.get("patients_queued", [])
    all_pts    = {p["patient_id"]: p for p in state.get("patients", [])}
    queued     = [all_pts[pid] for pid in queued_ids if pid in all_pts]
    return {"department": dept_id, "queue_length": dept.get("queue_length", 0), "queued_patients": queued}
