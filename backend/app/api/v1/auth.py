"""Authentication API — issues JWT access tokens for the viewer and operator roles."""

import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.api.deps import JWT_ALGORITHM
from app.config import settings
from app.core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_TOKEN_EXPIRE_SECONDS = 1800


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    """
    Authenticates a username/password pair against the configured viewer and
    operator credentials and issues a signed JWT access token on success.

    Parameters:
        request: The raw FastAPI Request object, required by slowapi's
                 per-route rate limit decorator to key on the caller's IP.
        body:    A LoginRequest body with "username" and "password" strings.

    Returns {"access_token": str, "token_type": "bearer", "role": str,
    "expires_in": 1800} on success. Raises HTTP 401 with
    {"detail": "Invalid credentials"} if neither credential pair matches.
    Rate limited to 5 requests per minute per IP.

    REST endpoint: POST /api/v1/auth/login — does not require authentication,
    since no one has a token yet at this point.
    """
    role = None
    if secrets.compare_digest(
        body.username, settings.AUTH_VIEWER_USERNAME
    ) and secrets.compare_digest(body.password, settings.AUTH_VIEWER_PASSWORD):
        role = "viewer"
    elif secrets.compare_digest(
        body.username, settings.AUTH_OPERATOR_USERNAME
    ) and secrets.compare_digest(body.password, settings.AUTH_OPERATOR_PASSWORD):
        role = "operator"

    if role is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expire = datetime.now(timezone.utc) + timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS)
    payload = {"sub": body.username, "role": role, "exp": expire}
    access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "expires_in": ACCESS_TOKEN_EXPIRE_SECONDS,
    }
