"""
PulseFlow AI — FastAPI Backend Entry Point
Hospital Digital Twin Platform
"""

from __future__ import annotations

import asyncio
import logging

import jwt
import structlog
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.deps import decode_access_token
from app.api.v1.router import api_router
from app.api.v1.ws_schemas import WS_MESSAGE_SCHEMAS
from app.core.rate_limit import limiter
from app.services.service import manager, simulation_service

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(message)s",
)

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, settings.LOG_LEVEL)
    ),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = logging.getLogger(__name__)
audit_logger = structlog.get_logger("audit")


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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

    Before accepting the connection: requires a "token" query param holding
    a valid JWT issued by POST /api/v1/auth/login. If missing, invalid, or
    expired, closes the connection with code 4401 and returns without ever
    calling manager.connect(). The token's role claim is kept for the
    lifetime of this connection and threaded into _handle_client_message()
    to gate operator-only actions.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user = decode_access_token(token)
    except jwt.PyJWTError:
        await websocket.close(code=4401)
        return

    accepted = await manager.connect(websocket)
    if not accepted:
        await websocket.close(code=4429)
        return

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
                await _handle_client_message(websocket, msg, user.role, user.username)
            except asyncio.TimeoutError:
                await manager.send_to(websocket, {"type": "ping"})
            except Exception:
                break

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)


OPERATOR_ONLY_MESSAGE_TYPES = {
    "trigger_event",
    "update_config",
    "add_bottleneck",
    "remove_bottleneck",
}


async def _handle_client_message(
    websocket: WebSocket, msg: dict, role: str, username: str
):
    """
    Validates and routes an incoming WebSocket message from a browser client
    to the correct simulation action, then sends back an acknowledgement to
    that same client.

    Parameters:
        websocket: The WebSocket connection object for the specific client
                   who sent this message — used to send the reply back.
        msg:       A Python dict parsed from the raw JSON the client sent.
                   Expected to have a "type" key whose value is one of:
                   "trigger_event", "update_config", "request_optimization",
                   "add_bottleneck", "remove_bottleneck", or "request_state".
        role:      The role ("viewer" or "operator") carried by this
                    connection's JWT, resolved once at connect time.
        username:  The username carried by this connection's JWT, used for
                   audit logging of write actions.

    Returns nothing directly; instead it awaits a send back to the client
    with a result, acknowledgement, or error dict. The message is validated
    against its pydantic schema (app/api/v1/ws_schemas.py) before anything
    else happens — an unrecognized type or a schema mismatch sends back
    {"type": "error", ...} and never touches simulation_service. Messages
    whose type is operator-only are rejected the same way if role isn't
    "operator".

    Called from the websocket_endpoint handler whenever the client sends text.
    """
    msg_type = msg.get("type", "")

    schema = WS_MESSAGE_SCHEMAS.get(msg_type)
    if schema is None:
        await manager.send_to(
            websocket,
            {"type": "error", "message": f"Unrecognized message type: {msg_type}"},
        )
        return

    try:
        validated = schema.model_validate(msg)
    except Exception as exc:
        await manager.send_to(
            websocket,
            {"type": "error", "message": f"Invalid message for type {msg_type}: {exc}"},
        )
        return

    if msg_type in OPERATOR_ONLY_MESSAGE_TYPES and role != "operator":
        await manager.send_to(
            websocket, {"type": "error", "message": "operator role required"}
        )
        return

    if msg_type == "trigger_event":
        simulation_service.trigger_event(validated.event_type, validated.params)
        audit_logger.info(
            "trigger_event",
            username=username,
            role=role,
            action="trigger_event",
            event_type=validated.event_type,
            params=validated.params,
            outcome="success",
        )
        await manager.send_to(
            websocket,
            {
                "type": "event_triggered",
                "event": validated.event_type,
                "success": True,
            },
        )

    elif msg_type == "update_config":
        simulation_service.update_config(validated.config)
        audit_logger.info(
            "update_config",
            username=username,
            role=role,
            action="update_config",
            updates=validated.config,
            outcome="success",
        )
        await manager.send_to(
            websocket,
            {
                "type": "config_updated",
                "success": True,
            },
        )

    elif msg_type == "request_optimization":
        result = await simulation_service.run_optimization()
        await manager.send_to(
            websocket,
            {
                "type": "optimization_result",
                "result": result,
            },
        )

    elif msg_type == "add_bottleneck":
        bottleneck = simulation_service.add_bottleneck(validated.bottleneck)
        audit_logger.info(
            "add_bottleneck",
            username=username,
            role=role,
            action="add_bottleneck",
            bottleneck=validated.bottleneck,
            outcome="success",
        )
        await manager.send_to(
            websocket,
            {
                "type": "bottleneck_added",
                "bottleneck": bottleneck,
            },
        )

    elif msg_type == "remove_bottleneck":
        ok = simulation_service.remove_bottleneck(validated.bottleneck_id)
        audit_logger.info(
            "remove_bottleneck",
            username=username,
            role=role,
            action="remove_bottleneck",
            bottleneck_id=validated.bottleneck_id,
            outcome="success" if ok else "error: bottleneck not found",
        )
        await manager.send_to(
            websocket,
            {
                "type": "bottleneck_removed",
                "success": ok,
            },
        )

    elif msg_type == "request_state":
        state = simulation_service.get_current_state()
        if state:
            state["type"] = "hospital_state"
            await manager.send_to(websocket, state)
