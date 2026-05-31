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
        """
        Sets up the ConnectionManager with an empty set to hold active
        WebSocket connections and an asyncio lock to keep that set
        thread-safe when connections arrive or leave concurrently.

        No input parameters.

        Returns nothing — called automatically when the module-level
        `manager` singleton is created at import time.
        """
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        """
        Accepts an incoming WebSocket handshake and adds the connection to
        the active pool so it will receive future broadcasts.

        Parameters:
            websocket: The WebSocket object provided by FastAPI when a new
                       client connects to the /ws endpoint.

        Returns nothing; logs the new total connection count.

        Called from main.py's websocket_endpoint when a browser opens a
        WebSocket connection.
        """
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        """
        Removes a WebSocket connection from the active pool when a client
        disconnects or an error occurs, so it no longer receives broadcasts.

        Parameters:
            websocket: The WebSocket object that has been closed or dropped.

        Returns nothing; logs the remaining connection count.

        Called from the finally block of main.py's websocket_endpoint.
        """
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: dict):
        """
        Sends the same JSON message to every currently connected WebSocket
        client, and silently removes any connections that have gone dead.

        Parameters:
            data: A Python dict that will be serialised to a JSON string
                  and pushed to all clients.  Values that are not normally
                  JSON-serialisable (like datetime) are converted to strings
                  via the default=str fallback.

        Returns nothing.

        Called by start_broadcast_loop() in SimulationService roughly every
        0.8 seconds to stream live hospital state to all browsers.
        """
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
        """
        Sends a JSON message to one specific WebSocket client rather than
        broadcasting to everyone.

        Parameters:
            websocket: The single WebSocket connection to write to.
            data:      A Python dict that will be JSON-serialised and sent.

        Returns nothing; logs any send error but does not raise.

        Called from main.py's websocket_endpoint to send targeted replies
        (e.g., event_triggered acknowledgements, or the initial state snapshot).
        """
        try:
            await websocket.send_text(json.dumps(data, default=str))
        except Exception as exc:
            logger.error(f"Send error: {exc}")

    @property
    def connection_count(self) -> int:
        """
        Returns the number of WebSocket clients that are currently connected.

        No input parameters — reads self.active_connections.

        Returns an integer count; used by the /health endpoint and by
        start_broadcast_loop to skip serialisation when nobody is listening.
        """
        return len(self.active_connections)


manager = ConnectionManager()

# ─────────────────────────────────────────────────────────────────────────────
# SIMULATION SERVICE
# ─────────────────────────────────────────────────────────────────────────────

def _make_config() -> SimulationConfig:
    """
    Reads all resource and speed settings from the application config and
    packages them into a SimulationConfig object ready to be passed to the
    HospitalSimulation constructor.

    No input parameters — reads from the module-level `settings` object.

    Returns a SimulationConfig dataclass with fields like er_beds,
    icu_doctors, arrival_rate, simulation_speed, etc.

    Called by SimulationService.__init__() and SimulationService.reset().
    """
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
        """
        Creates all the sub-services that SimulationService depends on:
        the simulation engine, optimizer, forecaster, AI copilot, and care
        coordinator, wiring them together under one orchestrating object.

        No input parameters.

        Returns nothing — called automatically when the module-level
        `simulation_service` singleton is created at import time.
        """
        self.simulation = HospitalSimulation(_make_config())
        self.optimizer  = HospitalOptimizer()
        self.forecaster = HospitalForecaster()
        self.copilot    = AICopilot(base_url=settings.OLLAMA_BASE_URL, model=settings.OLLAMA_MODEL)
        self.care       = CareCoordinator()
        self._running   = False

    def start(self):
        """
        Starts the hospital simulation engine in its background thread so
        patients begin arriving and flowing through departments.

        No input parameters.

        Returns nothing; logs a confirmation message.

        Called by main.py's lifespan() context manager on application startup.
        """
        self.simulation.start()
        logger.info("Simulation service started")

    def stop(self):
        """
        Stops the simulation engine and signals the broadcast loop to exit
        so the application can shut down cleanly.

        No input parameters.

        Returns nothing; logs a confirmation message.

        Called by main.py's lifespan() context manager on application shutdown,
        and by reset() before recreating the simulation.
        """
        self.simulation.stop()
        self._running = False
        logger.info("Simulation service stopped")

    async def start_broadcast_loop(self):
        """
        Runs an infinite async loop that fetches the latest simulation state
        every BROADCAST_INTERVAL seconds (default 0.8 s) and pushes it to
        all connected WebSocket clients.

        No input parameters.

        Returns nothing; the loop runs until cancelled or self._running is
        set to False (which happens when stop() is called).

        Called as an asyncio Task by main.py's lifespan() right after start(),
        and cancelled on shutdown.
        """
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
        """
        Runs the OR-Tools / SciPy optimizer against the current hospital
        state and enriches the result with an AI-generated narrative
        explaining the recommendations in plain English.

        No input parameters — reads state from the live simulation.

        Returns a dict containing optimization recommendations (staff
        reallocation, bed suggestions, etc.) plus an "ai_narrative" key
        with the Anthropic-generated explanation string.

        Called from the WebSocket handler when the client sends
        "request_optimization", and from the /ai/optimize REST endpoint.
        """
        state = self.simulation.get_hospital_state()
        if not state:
            return {}
        inp    = build_optimization_input_from_state(state)
        result = self.optimizer.optimize(inp).to_dict()
        result["ai_narrative"] = await self.copilot.generate_intervention_narrative(result, state)
        return result

    async def get_copilot_analysis(self) -> dict:
        """
        Produces a comprehensive AI analysis bundle containing an optimizer
        result, a bottleneck explanation, bottleneck predictions, and a
        demand forecast summary — everything the AI Copilot page needs.

        No input parameters — reads state, history, and forecasts from the
        live simulation.

        Returns a dict with keys: "explanation" (plain-English bottleneck
        analysis), "optimization" (recommendations dict), "bottleneck_predictions"
        (list of predicted future bottlenecks), and "forecast_summary" (1-hour
        and 3-hour arrival/demand forecasts).

        Called from the /ai/analysis REST endpoint.
        """
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
        """
        Returns a snapshot of the complete hospital state at this moment,
        including departments, patients, metrics, alerts, flow data, and
        the current care-coordination state.

        No input parameters.

        Returns a dict (may be empty if the simulation has not started yet).

        Called widely — by the broadcast loop, REST endpoints, and
        WebSocket message handlers whenever the latest state is needed.
        """
        state = self.simulation.get_hospital_state() or {}
        if state:
            state["care"] = self.care.get_state(self.simulation.sim_time)
        return state

    def trigger_event(self, event_type: str, params: dict = None):
        """
        Fires a named simulation event (e.g. "flu_outbreak" or "ct_failure")
        that changes patient arrival rates or disables resources in the engine.

        Parameters:
            event_type: A string identifying which event to trigger, such as
                        "flu_outbreak", "mass_casualty", or "clear_event".
            params:     An optional dict of additional parameters for the event
                        (e.g. a multiplier for arrival rate).  Defaults to {}.

        Returns nothing.

        Called from _handle_client_message() in main.py and from the
        /simulation/events/trigger REST endpoint.
        """
        self.simulation.trigger_event(event_type, params or {})

    def add_bottleneck(self, data: dict) -> dict:
        """
        Registers a new care-coordination bottleneck (e.g. a blocked
        corridor or unavailable specialist) and timestamps it with the
        current simulation time.

        Parameters:
            data: A dict describing the bottleneck — typically includes
                  keys like "department", "description", and "severity".

        Returns a dict representing the newly created bottleneck record,
        including a generated bottleneck_id.

        Called from _handle_client_message() in main.py and from the
        POST /ai/care/bottlenecks REST endpoint.
        """
        return self.care.add_bottleneck(data, now=self.simulation.sim_time)

    def remove_bottleneck(self, bottleneck_id: str) -> bool:
        """
        Deletes a previously registered bottleneck by its unique ID.

        Parameters:
            bottleneck_id: The string ID that was assigned when the bottleneck
                           was created by add_bottleneck().

        Returns True if the bottleneck was found and removed, or False if no
        bottleneck with that ID exists.

        Called from _handle_client_message() in main.py and from the
        DELETE /ai/care/bottlenecks/{bottleneck_id} REST endpoint.
        """
        return self.care.remove_bottleneck(bottleneck_id)

    def get_care_recommendations(self) -> list:
        """
        Fetches the current list of care-coordination recommendations (e.g.
        "Transfer patient X to ICU") generated by the CareCoordinator.

        No input parameters.

        Returns a list of recommendation dicts, each describing an action
        to take along with priority and affected department.

        Called from the GET /ai/care/recommendations REST endpoint.
        """
        return self.care.get_recommendations(self.simulation.sim_time)

    async def get_tracked_patient_summary(self, patient_id: str) -> Optional[dict]:
        """
        Looks up a patient that the CareCoordinator is tracking and asks the
        AI copilot to generate a human-readable clinical summary for them.

        Parameters:
            patient_id: The short alphanumeric ID string (e.g. "A3F2B1C9")
                        of the patient to summarise.

        Returns a dict with "patient_id" and "summary" keys if the patient
        is found, or None if the CareCoordinator is not tracking that ID.

        Called from the GET /ai/care/patients/{patient_id}/summary endpoint.
        """
        patient = self.care.get_patient(patient_id, self.simulation.sim_time)
        if not patient:
            return None
        summary = await self.copilot.generate_patient_summary(patient)
        return {"patient_id": patient_id, "summary": summary}

    def update_config(self, config_updates: dict):
        """
        Applies a partial set of configuration changes to the running
        simulation without restarting it (hot-reload), updating only the
        keys that are present in the provided dict.

        Parameters:
            config_updates: A dict whose keys match field names on
                            SimulationConfig (e.g. "arrival_rate", "er_beds")
                            and whose values are the new settings to apply.
                            Unknown keys are silently ignored.

        Returns nothing; logs each field change as old_value -> new_value.

        Called from _handle_client_message() in main.py and from the
        POST /simulation/config/update REST endpoint.
        """
        current_cfg = self.simulation.config
        for key, value in config_updates.items():
            if hasattr(current_cfg, key):
                old_val = getattr(current_cfg, key)
                setattr(current_cfg, key, value)
                logger.info(f"Config: {key}: {old_val} → {value}")
        self.simulation.update_config(current_cfg)

    def get_metrics_history(self, minutes: int = 60) -> list:
        """
        Retrieves a time-ordered list of metrics snapshots from the last N
        simulated minutes, useful for drawing trend charts in the frontend.

        Parameters:
            minutes: How many simulated minutes of history to return.
                     Defaults to 60 (one simulated hour).

        Returns a list of dicts where each dict is one snapshot containing
        fields like total_patients, er_occupancy, avg_wait_time, etc.

        Called by the /simulation/metrics/history endpoint and by
        get_copilot_analysis() for forecasting input.
        """
        return self.simulation.get_metrics_history(minutes)

    def get_forecast(self, horizon_minutes: int = 60) -> dict:
        """
        Generates demand and capacity forecasts by feeding the last 120
        minutes of metrics history into the HospitalForecaster model.

        Parameters:
            horizon_minutes: How many simulated minutes into the future to
                             forecast.  Defaults to 60.

        Returns a dict of forecast objects keyed by department or metric
        name (e.g. "er_arrivals_1h"), each with predicted values and
        confidence intervals.

        Called from the GET /simulation/forecast endpoint.
        """
        history = self.simulation.get_metrics_history(120)
        return self.forecaster.forecast_all(history, self.simulation.sim_time)

    def reset(self):
        """
        Completely tears down the current simulation and starts a fresh one
        with default settings, clearing all patients, events, and care state.

        No input parameters.

        Returns nothing; logs a confirmation message.

        Called from the POST /simulation/reset REST endpoint when the user
        clicks the "Reset Simulation" button in the Sandbox page.
        """
        self.simulation.stop()
        self.simulation = HospitalSimulation(_make_config())
        self.care = CareCoordinator()
        self.simulation.start()
        logger.info("Simulation reset to defaults")


simulation_service = SimulationService()
