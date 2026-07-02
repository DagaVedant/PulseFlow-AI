"""Shared FastAPI dependencies for the API layer: JWT authentication and role enforcement."""

from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException

from app.config import settings

JWT_ALGORITHM = "HS256"


class AuthenticatedUser:
    """Represents the identity decoded from a valid JWT: a username and a role."""

    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role


def decode_access_token(token: str) -> AuthenticatedUser:
    """
    Decodes and validates a JWT access token issued by POST /api/v1/auth/login.

    Parameters:
        token: The raw JWT string, without the "Bearer " prefix.

    Returns an AuthenticatedUser with the username and role from the token's
    claims. Raises jwt.PyJWTError (or a subclass, e.g. ExpiredSignatureError
    or InvalidTokenError) if the token is malformed, expired, or has an
    invalid signature.

    Called from get_current_user() for REST requests and from the raw
    WebSocket handshake in main.py's websocket_endpoint, so both auth paths
    share the exact same verification logic.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return AuthenticatedUser(username=payload["sub"], role=payload["role"])


async def get_current_user(
    authorization: str = Header(default=None),
) -> AuthenticatedUser:
    """
    Validates the Authorization header on incoming REST requests and resolves
    the caller's identity from their JWT.

    Parameters:
        authorization: The raw "Authorization" request header, expected in
                        the form "Bearer <token>". Injected automatically by
                        FastAPI from the incoming request.

    Returns an AuthenticatedUser on success. Raises HTTPException(401) if the
    header is missing, malformed, or the token is invalid/expired.

    Applied as the default dependency on api_router in app/api/v1/router.py
    so it covers every route under /api/v1 except /auth/login.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )

    token = authorization.removeprefix("Bearer ")
    try:
        return decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_operator(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """
    Restricts a route to callers whose JWT role claim is "operator".

    Parameters:
        user: The AuthenticatedUser resolved by get_current_user(), injected
              automatically since this depends on that dependency.

    Returns the same AuthenticatedUser on success. Raises HTTPException(403)
    if the caller's role is not "operator".

    Applied as an extra per-route dependency on write endpoints (simulation
    event triggers, config updates, resets, and bottleneck mutations).
    """
    if user.role != "operator":
        raise HTTPException(status_code=403, detail="Operator role required")
    return user
