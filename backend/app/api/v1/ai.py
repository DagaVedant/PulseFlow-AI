"""AI and care coordination API — copilot analysis, optimization, shift reports, specialists, and constraints."""
from fastapi import APIRouter, HTTPException, Body
from app.services.service import simulation_service

router = APIRouter(prefix="/ai", tags=["ai"])

# ─── Copilot / Optimization ───────────────────────────────────────────────────

@router.get("/analysis")
async def get_copilot_analysis():
    return await simulation_service.get_copilot_analysis()

@router.get("/optimize")
async def run_optimization():
    return await simulation_service.run_optimization()

@router.get("/shift-report")
async def get_shift_report():
    state   = simulation_service.get_current_state()
    history = simulation_service.get_metrics_history(60)
    report  = await simulation_service.copilot.generate_shift_report(state, history)
    return {"report": report, "sim_time": state.get("sim_time", 0)}

@router.get("/forecast/bottlenecks")
async def get_bottleneck_predictions():
    state   = simulation_service.get_current_state()
    history = simulation_service.get_metrics_history(60)
    predictions = simulation_service.forecaster.generate_bottleneck_predictions(state, history)
    return {"predictions": predictions}

# ─── Care Coordination ────────────────────────────────────────────────────────

@router.get("/care/state")
async def get_care_state():
    return simulation_service.care.get_state(simulation_service.simulation.sim_time)

@router.get("/care/recommendations")
async def get_care_recommendations():
    return {"recommendations": simulation_service.get_care_recommendations()}

@router.get("/care/specialists")
async def list_specialists():
    return {"specialists": simulation_service.care.get_state(simulation_service.simulation.sim_time)["specialists"]}

@router.get("/care/bottlenecks")
async def list_bottlenecks():
    return {"bottlenecks": simulation_service.care.get_state(simulation_service.simulation.sim_time)["bottlenecks"]}

@router.post("/care/bottlenecks")
async def add_bottleneck(data: dict = Body(...)):
    return simulation_service.add_bottleneck(data)

@router.delete("/care/bottlenecks/{bottleneck_id}")
async def remove_bottleneck(bottleneck_id: str):
    ok = simulation_service.remove_bottleneck(bottleneck_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Bottleneck not found")
    return {"removed": bottleneck_id}

@router.get("/care/patients/{patient_id}/summary")
async def get_tracked_patient_summary(patient_id: str):
    result = await simulation_service.get_tracked_patient_summary(patient_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tracked patient not found")
    return result
