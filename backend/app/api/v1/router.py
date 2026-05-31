"""Main API v1 router."""
from fastapi import APIRouter
from app.api.v1 import simulation, hospital, ai

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(simulation.router)
api_router.include_router(hospital.router)
api_router.include_router(ai.router)
