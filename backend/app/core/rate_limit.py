"""Shared slowapi Limiter instance, defined separately from main.py so route modules (e.g. auth.py) can apply per-route limits without a circular import."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL if settings.REDIS_URL else None,
    default_limits=["100/minute"],
)
