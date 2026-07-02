"""Shared FastAPI dependency that gates every API route behind a single shared secret."""

import secrets

from fastapi import Header, HTTPException

from app.config import settings


async def verify_token(authorization: str = Header(default=None)) -> None:
    """
    Checks the Authorization header on incoming REST requests against the
    shared SECRET_KEY.

    Parameters:
        authorization: The raw "Authorization" request header, expected in
                        the form "Bearer <token>". Injected automatically by
                        FastAPI from the incoming request.

    Returns nothing on success. Raises HTTPException(401) if the header is
    missing, malformed, or the token doesn't match SECRET_KEY.

    Applied as the default dependency on api_router in app/api/v1/router.py
    so it covers every route under /api/v1 except /health.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )

    token = authorization.removeprefix("Bearer ")
    if not secrets.compare_digest(token, settings.SECRET_KEY):
        raise HTTPException(status_code=401, detail="Invalid token")
