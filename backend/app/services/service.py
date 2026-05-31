"""
PulseFlow AI — Service Layer
Consolidates WebSocket connection management and simulation orchestration.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, Optional, Set

from fastapi import WebSocket

from app.core.simulation.engine import HospitalSimulation, SimulationConfig
from app.core.analytics import (
    HospitalOptimizer, build_optimization_input_from_state,
    HospitalForecaster, AICopilot, CareCoordinator,
)
from app.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET MANAGER
# ─────────────────────────────────────────────────────────────────────────────

class ConnectionManager:
    """Manages all active WebSocket connections and broadcasts state updates."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        message = json.dumps(data, default=str)
        dead: Set[WebSocket] = set()
        async with self._lock:
            connections = set(self.active_connections)
        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self.active_connections.discard(ws)

    async def send_to(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_text(json.dumps(data, default=str))
        except Exception as exc:
            logger.error(f"Send error: {exc}")

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()

# ─────────────────────────────────────────────────────────────────────────────
# SIMULATION SERVICE
# ─────────────────────────────────────────────────────────────────────────────

def _make_config() -> SimulationConfig:
    return SimulationConfig(
        arrival_rate=settings.BASE_ARRIVAL_RATE,
        simulation_speed=settings.SIMULATION_SPEED,
        er_beds=settings.ER_BEDS, er_doctors=settings.ER_DOCTORS, er_nurses=settings.ER_NURSES,
        lab_technicians=settings.LAB_TECHNICIANS, lab_analyzers=settings.LAB_ANALYZERS,
        imaging_ct=settings.IMAGING_CT_SCANNERS, imaging_mri=settings.IMAGING_MRI_MACHINES,
        imaging_xray=settings.IMAGING_XRAY_ROOMS,
        icu_beds=settings.ICU_BEDS, icu_doctors=settings.ICU_DOCTORS, icu_nurses=settings.ICU_NURSES,
        ward_beds=settings.WARD_BEDS, ward_doctors=settings.WARD_DOCTORS, ward_nurses=settings.WARD_NURSES,
        discharge_staff=settings.DISCHARGE_STAFF,
    )


class SimulationService:
    """Orchestrates the hospital simulation and all dependent analytics services."""

    def __init__(self):
        self.simulation = HospitalSimulation(_make_config())
        self.optimizer  = HospitalOptimizer()
        self.forecaster = HospitalForecaster()
        self.copilot    = AICopilot(base_url=settings.OLLAMA_BASE_URL, model=settings.OLLAMA_MODEL)
        self.care       = CareCoordinator()
        self._running   = False

    def start(self):
        self.simulation.start()
        logger.info("Simulation service started")

    def stop(self):
        self.simulation.stop()
        self._running = False
        logger.info("Simulation service stopped")

    async def start_broadcast_loop(self):
        self._running = True
        interval = settings.BROADCAST_INTERVAL
        while self._running:
            try:
                if manager.connection_count > 0:
                    state = self.simulation.get_hospital_state()
                    if state:
                        state["type"] = "hospital_state"
                        state["care"] = self.care.get_state(self.simulation.sim_time)
                        await manager.broadcast(state)
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Broadcast loop error: {exc}")
                await asyncio.sleep(1.0)

    async def run_optimization(self) -> dict:
        state = self.simulation.get_hospital_state()
        if not state:
            return {}
        inp    = build_optimization_input_from_state(state)
        result = self.optimizer.optimize(inp).to_dict()
        result["ai_narrative"] = await self.copilot.generate_intervention_narrative(result, state)
        return result

    async def get_copilot_analysis(self) -> dict:
        state = self.simulation.get_hospital_state()
        if not state:
            return {}
        inp        = build_optimization_input_from_state(state)
        opt_result = self.optimizer.optimize(inp).to_dict()
        history    = self.simulation.get_metrics_history(60)
        bottleneck_preds = self.forecaster.generate_bottleneck_predictions(state, history)

        narrative, explanation = await asyncio.gather(
            self.copilot.generate_intervention_narrative(opt_result, state),
            self.copilot.explain_bottleneck(state, opt_result),
            return_exceptions=True,
        )
        if isinstance(narrative, Exception):
            narrative = self.copilot._fallback_intervention_narrative(opt_result)
        if isinstance(explanation, Exception):
            explanation = self.copilot._fallback_bottleneck_explanation(state, opt_result, "")

        opt_result["ai_narrative"] = narrative
        forecast = self.simulation.get_forecast(horizon_minutes=180)
        return {
            "explanation": explanation,
            "optimization": opt_result,
            "bottleneck_predictions": bottleneck_preds,
            "forecast_summary": {
                k: v.to_dict() if hasattr(v, "to_dict") else v
                for k, v in forecast.items()
                if k.endswith("_1h") or k.endswith("_3h")
            },
        }

    def get_current_state(self) -> dict:
        state = self.simulation.get_hospital_state() or {}
        if state:
            state["care"] = self.care.get_state(self.simulation.sim_time)
        return state

    def trigger_event(self, event_type: str, params: dict = None):
        self.simulation.trigger_event(event_type, params or {})

    def add_bottleneck(self, data: dict) -> dict:
        return self.care.add_bottleneck(data, now=self.simulation.sim_time)

    def remove_bottleneck(self, bottleneck_id: str) -> bool:
        return self.care.remove_bottleneck(bottleneck_id)

    def get_care_recommendations(self) -> list:
        return self.care.get_recommendations(self.simulation.sim_time)

    async def get_tracked_patient_summary(self, patient_id: str) -> Optional[dict]:
        patient = self.care.get_patient(patient_id, self.simulation.sim_time)
        if not patient:
            return None
        summary = await self.copilot.generate_patient_summary(patient)
        return {"patient_id": patient_id, "summary": summary}

    def update_config(self, config_updates: dict):
        current_cfg = self.simulation.config
        for key, value in config_updates.items():
            if hasattr(current_cfg, key):
                old_val = getattr(current_cfg, key)
                setattr(current_cfg, key, value)
                logger.info(f"Config: {key}: {old_val} → {value}")
        self.simulation.update_config(current_cfg)

    def get_metrics_history(self, minutes: int = 60) -> list:
        return self.simulation.get_metrics_history(minutes)

    def get_forecast(self, horizon_minutes: int = 60) -> dict:
        history = self.simulation.get_metrics_history(120)
        return self.forecaster.forecast_all(history, self.simulation.sim_time)

    def reset(self):
        self.simulation.stop()
        self.simulation = HospitalSimulation(_make_config())
        self.care = CareCoordinator()
        self.simulation.start()
        logger.info("Simulation reset to defaults")


simulation_service = SimulationService()
