"""
PulseFlow AI — FastAPI Backend Entry Point
Hospital Digital Twin Platform
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.api.v1.router import api_router
from app.services.service import manager, simulation_service

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown for the FastAPI server,
    following the modern asynccontextmanager lifespan pattern.

    Parameters:
        app: The FastAPI application instance (injected automatically by
             FastAPI; you never call this function directly).

    On startup (before yield): starts the simulation engine in its
    background thread and launches the async broadcast loop task that
    streams state to WebSocket clients every 0.8 seconds.

    On shutdown (after yield): cancels the broadcast task and stops the
    simulation engine cleanly.

    Returns nothing; used as the lifespan= argument when creating the
    FastAPI app object.
    """
    logger.info("Starting PulseFlow AI backend...")

    simulation_service.start()

    broadcast_task = asyncio.create_task(simulation_service.start_broadcast_loop())
    logger.info("Hospital simulation running. Broadcasting via WebSocket.")

    yield

    broadcast_task.cancel()
    simulation_service.stop()
    logger.info("PulseFlow AI backend shutdown complete.")

app = FastAPI(
    title="PulseFlow AI",
    description="AI-Powered Hospital Operating System — Digital Twin Platform",
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/health")
async def health():
    """
    Returns a quick health-check snapshot of the running backend.

    No input parameters.

    Returns a JSON object with the backend status string, version number,
    current simulation time in minutes, number of active patients, and
    how many WebSocket clients are connected right now.

    Called automatically by load-balancers or monitoring tools that poll
    GET /health to confirm the service is alive.
    """
    return {
        "status": "operational",
        "version": settings.VERSION,
        "simulation_time": simulation_service.simulation.sim_time,
        "active_patients": len(simulation_service.simulation.active_patients),
        "websocket_connections": manager.connection_count,
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Accepts a WebSocket connection from a browser client and streams live
    hospital state updates to it for the duration of the session.

    Parameters:
        websocket: The WebSocket connection object injected by FastAPI when
                   a client connects to ws://localhost:8000/ws.

    Returns nothing; runs an infinite receive loop until the client
    disconnects or an unrecoverable error occurs.

    On connect: immediately sends the current hospital state snapshot.
    While connected: listens for client messages (e.g. trigger_event,
    update_config) and delegates them to _handle_client_message().
    Every 30 seconds without a message: sends a {"type": "ping"} to keep
    the connection alive.
    On disconnect: calls manager.disconnect() to clean up.
    """
    await manager.connect(websocket)

    try:
        state = simulation_service.get_current_state()
        if state:
            state["type"] = "hospital_state"
            await manager.send_to(websocket, state)

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                import json
                msg = json.loads(data)
                await _handle_client_message(websocket, msg)
            except asyncio.TimeoutError:
                await manager.send_to(websocket, {"type": "ping"})
            except Exception:
                break

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)

async def _handle_client_message(websocket: WebSocket, msg: dict):
    """
    Routes an incoming WebSocket message from a browser client to the correct
    simulation action and sends back an acknowledgement to that same client.

    Parameters:
        websocket: The WebSocket connection object for the specific client
                   who sent this message — used to send the reply back.
        msg:       A Python dict parsed from the raw JSON the client sent.
                   Expected to have a "type" key whose value is one of:
                   "trigger_event", "update_config", "request_optimization",
                   "add_bottleneck", "remove_bottleneck", or "request_state".

    Returns nothing directly; instead it awaits a send back to the client
    with a result or acknowledgement dict.

    Called from the websocket_endpoint handler whenever the client sends text.
    """
    msg_type = msg.get("type", "")

    if msg_type == "trigger_event":
        event = msg.get("event_type", "")
        params = msg.get("params", {})
        simulation_service.trigger_event(event, params)
        await manager.send_to(websocket, {
            "type": "event_triggered",
            "event": event,
            "success": True,
        })

    elif msg_type == "update_config":
        updates = msg.get("config", {})
        simulation_service.update_config(updates)
        await manager.send_to(websocket, {
            "type": "config_updated",
            "success": True,
        })

    elif msg_type == "request_optimization":
        result = await simulation_service.run_optimization()
        await manager.send_to(websocket, {
            "type": "optimization_result",
            "result": result,
        })

    elif msg_type == "add_bottleneck":
        bottleneck = simulation_service.add_bottleneck(msg.get("bottleneck", {}))
        await manager.send_to(websocket, {
            "type": "bottleneck_added",
            "bottleneck": bottleneck,
        })

    elif msg_type == "remove_bottleneck":
        ok = simulation_service.remove_bottleneck(msg.get("bottleneck_id", ""))
        await manager.send_to(websocket, {
            "type": "bottleneck_removed",
            "success": ok,
        })

    elif msg_type == "request_state":
        state = simulation_service.get_current_state()
        if state:
            state["type"] = "hospital_state"
            await manager.send_to(websocket, state)
