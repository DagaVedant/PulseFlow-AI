"""AI and care coordination API — copilot analysis, optimization, shift reports, specialists, and constraints."""
from fastapi import APIRouter, HTTPException, Body
from app.services.service import simulation_service

router = APIRouter(prefix="/ai", tags=["ai"])

# ─── Copilot / Optimization ───────────────────────────────────────────────────

@router.get("/analysis")
async def get_copilot_analysis():
    """
    Returns the full AI Copilot analysis bundle for the current hospital
    state, including optimization recommendations, bottleneck explanations,
    bottleneck predictions, and demand forecasts.

    No query parameters.

    Returns a dict with keys: "explanation", "optimization",
    "bottleneck_predictions", and "forecast_summary".

    REST endpoint: GET /api/v1/ai/analysis
    """
    return await simulation_service.get_copilot_analysis()

@router.get("/optimize")
async def run_optimization():
    """
    Runs the resource-allocation optimizer against the current hospital
    state and returns its recommendations along with an AI narrative.

    No query parameters.

    Returns a dict with optimization recommendations (staff reallocation,
    bed suggestions) and an "ai_narrative" string explaining them in plain
    English.

    REST endpoint: GET /api/v1/ai/optimize
    """
    return await simulation_service.run_optimization()

@router.get("/shift-report")
async def get_shift_report():
    """
    Generates an AI-written shift summary report covering the last 60
    simulated minutes, suitable for a handover briefing between staff shifts.

    No query parameters.

    Returns a JSON object with a "report" string (the full narrative) and
    "sim_time" (the current simulation clock in minutes).

    REST endpoint: GET /api/v1/ai/shift-report
    """
    state   = simulation_service.get_current_state()
    history = simulation_service.get_metrics_history(60)
    report  = await simulation_service.copilot.generate_shift_report(state, history)
    return {"report": report, "sim_time": state.get("sim_time", 0)}

@router.get("/forecast/bottlenecks")
async def get_bottleneck_predictions():
    """
    Predicts which hospital departments are likely to become bottlenecks
    in the near future based on current state and recent metrics history.

    No query parameters.

    Returns a JSON object with a "predictions" list, where each entry
    describes a predicted bottleneck department, its probability, and a
    suggested time window.

    REST endpoint: GET /api/v1/ai/forecast/bottlenecks
    """
    state   = simulation_service.get_current_state()
    history = simulation_service.get_metrics_history(60)
    predictions = simulation_service.forecaster.generate_bottleneck_predictions(state, history)
    return {"predictions": predictions}

# ─── Care Coordination ────────────────────────────────────────────────────────

@router.get("/care/state")
async def get_care_state():
    """
    Returns the complete care-coordination state snapshot, including
    all tracked patients, active bottlenecks, specialist statuses, and
    pending recommendations.

    No query parameters.

    Returns the raw dict produced by CareCoordinator.get_state().

    REST endpoint: GET /api/v1/ai/care/state
    """
    return simulation_service.care.get_state(simulation_service.simulation.sim_time)

@router.get("/care/recommendations")
async def get_care_recommendations():
    """
    Returns a list of actionable care-coordination recommendations for the
    current hospital state, such as patient transfers or resource adjustments.

    No query parameters.

    Returns a JSON object with a "recommendations" list of dicts, each
    describing one suggested action with priority and affected department.

    REST endpoint: GET /api/v1/ai/care/recommendations
    """
    return {"recommendations": simulation_service.get_care_recommendations()}

@router.get("/care/specialists")
async def list_specialists():
    """
    Returns the list of on-call specialists tracked by the CareCoordinator,
    including their name, specialty, and current availability status.

    No query parameters.

    Returns a JSON object with a "specialists" list of dicts.

    REST endpoint: GET /api/v1/ai/care/specialists
    """
    return {"specialists": simulation_service.care.get_state(simulation_service.simulation.sim_time)["specialists"]}

@router.get("/care/bottlenecks")
async def list_bottlenecks():
    """
    Returns all currently registered care-coordination bottlenecks
    (manually flagged blockages) from the CareCoordinator.

    No query parameters.

    Returns a JSON object with a "bottlenecks" list of dicts, each
    describing a bottleneck with its ID, department, description,
    severity, and creation timestamp.

    REST endpoint: GET /api/v1/ai/care/bottlenecks
    """
    return {"bottlenecks": simulation_service.care.get_state(simulation_service.simulation.sim_time)["bottlenecks"]}

@router.post("/care/bottlenecks")
async def add_bottleneck(data: dict = Body(...)):
    """
    Creates a new care-coordination bottleneck record from the JSON body
    sent by the client.

    Parameters:
        data: A JSON request body dict describing the bottleneck — typically
              includes "department", "description", and "severity" keys.

    Returns the newly created bottleneck dict including its generated ID.

    REST endpoint: POST /api/v1/ai/care/bottlenecks
    """
    return simulation_service.add_bottleneck(data)

@router.delete("/care/bottlenecks/{bottleneck_id}")
async def remove_bottleneck(bottleneck_id: str):
    """
    Deletes a care-coordination bottleneck by its unique ID.

    Parameters:
        bottleneck_id: The string ID of the bottleneck to remove, taken
                       from the URL path.

    Returns a JSON object {"removed": bottleneck_id} on success, or raises
    HTTP 404 if no bottleneck with that ID is registered.

    REST endpoint: DELETE /api/v1/ai/care/bottlenecks/{bottleneck_id}
    """
    ok = simulation_service.remove_bottleneck(bottleneck_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Bottleneck not found")
    return {"removed": bottleneck_id}

@router.get("/care/patients/{patient_id}/summary")
async def get_tracked_patient_summary(patient_id: str):
    """
    Retrieves an AI-generated clinical narrative summary for a patient that
    the CareCoordinator is actively tracking.

    Parameters:
        patient_id: The short alphanumeric ID of the patient, taken from
                    the URL path.

    Returns a JSON object with "patient_id" and "summary" (plain-English
    narrative), or raises HTTP 404 if the patient is not being tracked.

    REST endpoint: GET /api/v1/ai/care/patients/{patient_id}/summary
    """
    result = await simulation_service.get_tracked_patient_summary(patient_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tracked patient not found")
    return result
