"""Exposes the shared simulation_service singleton."""
from app.services.simulation_service import simulation_service
from app.services.websocket_manager import manager

__all__ = ["simulation_service", "manager"]
