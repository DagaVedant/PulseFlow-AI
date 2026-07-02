"""Main API v1 router."""

from fastapi import APIRouter, Depends
from app.api.v1 import simulation, hospital, ai
from app.api.deps import verify_token

api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(verify_token)])
api_router.include_router(simulation.router)
api_router.include_router(hospital.router)
api_router.include_router(ai.router)
