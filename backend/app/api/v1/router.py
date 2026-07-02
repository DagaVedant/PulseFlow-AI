"""Main API v1 router."""

from fastapi import APIRouter, Depends
from app.api.v1 import simulation, hospital, ai, auth
from app.api.deps import get_current_user

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)

authenticated_router = APIRouter(dependencies=[Depends(get_current_user)])
authenticated_router.include_router(simulation.router)
authenticated_router.include_router(hospital.router)
authenticated_router.include_router(ai.router)

api_router.include_router(authenticated_router)
