"""Simulation control API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.simulation_service import simulation_service

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
    """Get the full current hospital simulation state."""
    state = simulation_service.get_current_state()
    if not state:
        raise HTTPException(status_code=503, detail="Simulation not running")
    return state

@router.get("/metrics/history")
async def get_metrics_history(minutes: int = 60):
    """Get historical metrics for charting."""
    return simulation_service.get_metrics_history(min(minutes, 1440))

@router.post("/events/trigger")
async def trigger_event(request: EventRequest):
    """Trigger an emergency or operational event."""
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
    """Update simulation configuration (hot reload)."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    simulation_service.update_config(updates)
    return {"success": True, "updated": list(updates.keys())}

@router.get("/forecast")
async def get_forecast(horizon_minutes: int = 60):
    """Get demand and capacity forecasts."""
    forecasts = simulation_service.get_forecast(horizon_minutes)
    return {
        k: v.to_dict() if hasattr(v, "to_dict") else v
        for k, v in forecasts.items()
    }
