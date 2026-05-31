"""Simulation control API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.service import simulation_service

router = APIRouter(prefix="/simulation", tags=["simulation"])

class EventRequest(BaseModel):
    event_type: str
    params: Optional[dict] = None

class ConfigUpdateRequest(BaseModel):
    arrival_rate: Optional[float] = None
    er_beds: Optional[int] = None
    er_doctors: Optional[int] = None
    er_nurses: Optional[int] = None
    lab_technicians: Optional[int] = None
    lab_analyzers: Optional[int] = None
    imaging_ct: Optional[int] = None
    imaging_mri: Optional[int] = None
    icu_beds: Optional[int] = None
    icu_doctors: Optional[int] = None
    icu_nurses: Optional[int] = None
    ward_beds: Optional[int] = None
    ward_doctors: Optional[int] = None
    ward_nurses: Optional[int] = None
    simulation_speed: Optional[int] = None

@router.get("/state")
async def get_simulation_state():
    """
    Returns the full current hospital simulation state snapshot, including
    all departments, active patients, metrics, alerts, and flow data.

    No query parameters.

    Returns a large JSON dict mirroring the hospital_state WebSocket payload,
    or raises HTTP 503 if the simulation is not yet running.

    REST endpoint: GET /api/v1/simulation/state
    """
    state = simulation_service.get_current_state()
    if not state:
        raise HTTPException(status_code=503, detail="Simulation not running")
    return state

@router.get("/metrics/history")
async def get_metrics_history(minutes: int = 60):
    """
    Returns a time-ordered list of metrics snapshots from the simulation's
    recent history, capped at 24 simulated hours (1440 minutes).

    Parameters:
        minutes: How many simulated minutes of history to retrieve.
                 Defaults to 60; maximum accepted is 1440.

    Returns a JSON list where each element is a snapshot dict containing
    fields such as total_patients, er_occupancy, and avg_wait_time.

    REST endpoint: GET /api/v1/simulation/metrics/history?minutes=60
    """
    return simulation_service.get_metrics_history(min(minutes, 1440))

@router.post("/events/trigger")
async def trigger_event(request: EventRequest):
    """
    Fires a named simulation event that changes patient arrival rates or
    disables resources, simulating real-world emergencies or equipment
    failures.

    Parameters:
        request: An EventRequest body with:
                 - event_type (str): One of "flu_outbreak", "ct_failure",
                   "mri_failure", "lab_slowdown", "mass_casualty",
                   "heatwave", "covid_surge", "staff_shortage", or
                   "clear_event".
                 - params (dict, optional): Additional event parameters.

    Returns {"success": True, "event": event_type} on success, or raises
    HTTP 400 if the event_type is not in the allowed list.

    REST endpoint: POST /api/v1/simulation/events/trigger
    """
    allowed_events = {
        "flu_outbreak", "ct_failure", "mri_failure", "lab_slowdown",
        "mass_casualty", "heatwave", "covid_surge", "staff_shortage",
        "clear_event",
    }
    if request.event_type not in allowed_events:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {request.event_type}")

    simulation_service.trigger_event(request.event_type, request.params)
    return {"success": True, "event": request.event_type}

@router.post("/config/update")
async def update_config(request: ConfigUpdateRequest):
    """
    Applies a partial configuration update to the running simulation without
    restarting it, changing only the fields that are included in the request.

    Parameters:
        request: A ConfigUpdateRequest body where any combination of fields
                 can be provided (all are optional): arrival_rate,
                 er_beds/doctors/nurses, lab_technicians/analyzers,
                 imaging_ct/mri, icu_beds/doctors/nurses,
                 ward_beds/doctors/nurses, simulation_speed.
                 Fields left as None are not changed.

    Returns {"success": True, "updated": [list of changed field names]}.

    REST endpoint: POST /api/v1/simulation/config/update
    """
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    simulation_service.update_config(updates)
    return {"success": True, "updated": list(updates.keys())}

@router.post("/reset")
async def reset_simulation():
    """
    Stops the current simulation and starts a completely fresh one with
    default settings, erasing all patients, active events, bottlenecks,
    and configuration changes made during the session.

    No request body parameters.

    Returns {"success": True} once the new simulation is up and running.

    REST endpoint: POST /api/v1/simulation/reset
    Called from the "Reset Simulation" button on the Sandbox page.
    """
    simulation_service.reset()
    return {"success": True}

@router.get("/forecast")
async def get_forecast(horizon_minutes: int = 60):
    """
    Returns demand and capacity forecasts for each department, projecting
    arrivals and resource utilisation up to horizon_minutes ahead.

    Parameters:
        horizon_minutes: How many simulated minutes into the future to
                         forecast.  Defaults to 60.

    Returns a JSON dict keyed by metric/department name where each value
    is a forecast dict (with predicted values and confidence intervals),
    or a raw dict if the forecast object has no to_dict() method.

    REST endpoint: GET /api/v1/simulation/forecast?horizon_minutes=60
    """
    forecasts = simulation_service.get_forecast(horizon_minutes)
    return {
        k: v.to_dict() if hasattr(v, "to_dict") else v
        for k, v in forecasts.items()
    }
