"""WebSocket connection manager for real-time state broadcasting."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

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
        """Broadcast data to all connected clients."""
        if not self.active_connections:
            return

        message = json.dumps(data, default=str)
        dead = set()

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
        """Send data to a specific client."""
        try:
            await websocket.send_text(json.dumps(data, default=str))
        except Exception as exc:
            logger.error(f"Send error: {exc}")

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

manager = ConnectionManager()
