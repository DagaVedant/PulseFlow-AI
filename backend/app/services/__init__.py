"""Exposes the shared simulation_service singleton and WebSocket manager."""
from app.services.service import simulation_service, manager

__all__ = ["simulation_service", "manager"]
