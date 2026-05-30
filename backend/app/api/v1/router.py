"""Main API v1 router."""
from fastapi import APIRouter
from app.api.v1 import simulation, patients, departments, copilot

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(simulation.router)
api_router.include_router(patients.router)
api_router.include_router(departments.router)
api_router.include_router(copilot.router)
