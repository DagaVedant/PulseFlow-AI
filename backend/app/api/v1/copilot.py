"""AI Copilot API endpoints."""
from fastapi import APIRouter
from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/copilot", tags=["copilot"])

@router.get("/analysis")
async def get_copilot_analysis():
    """Get full AI copilot analysis: bottleneck explanation, optimization, forecasts."""
    return await simulation_service.get_copilot_analysis()

@router.get("/optimize")
async def run_optimization():
    """Run optimization engine and return recommendations with AI narrative."""
    return await simulation_service.run_optimization()

@router.get("/shift-report")
async def get_shift_report():
    """Generate an AI-powered shift handover report."""
    state = simulation_service.get_current_state()
    history = simulation_service.get_metrics_history(60)
    report = await simulation_service.copilot.generate_shift_report(state, history)
    return {"report": report, "sim_time": state.get("sim_time", 0)}

@router.get("/forecast/bottlenecks")
async def get_bottleneck_predictions():
    """Get predicted bottlenecks with confidence scores."""
    state = simulation_service.get_current_state()
    history = simulation_service.get_metrics_history(60)
    predictions = simulation_service.forecaster.generate_bottleneck_predictions(state, history)
    return {"predictions": predictions}
