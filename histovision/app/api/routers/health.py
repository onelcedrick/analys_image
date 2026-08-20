"""Santé + keep-alive (ping) pour Hugging Face / reverse-proxy.

GET  /api/health  -> état de l'API
GET  /api/ping    -> keep-alive front (toutes les ~2 min)
HEAD /api/ping    -> probe sans corps
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Request, Response

from app.config import get_settings

router = APIRouter(tags=["health"])

_last_ping_at: float | None = None
_ping_count: int = 0


@router.get("/health")
async def health_check() -> dict:
    """Indique que l'API est vivante."""
    settings = get_settings()
    return {
        "status": "ok",
        "version": settings.app_version,
        "service": settings.app_name,
        "ts": time.time(),
        "last_ping_at": _last_ping_at,
        "ping_count": _ping_count,
    }


@router.get("/ping")
async def ping() -> dict:
    """Keep-alive ultra-léger — appelé par le front toutes les 2 minutes.

    Empêche la mise en veille des Spaces Hugging Face (free tier).
    """
    global _last_ping_at, _ping_count
    _last_ping_at = time.time()
    _ping_count += 1
    return {"pong": True, "ts": _last_ping_at, "n": _ping_count}


@router.head("/ping")
async def ping_head() -> Response:
    global _last_ping_at, _ping_count
    _last_ping_at = time.time()
    _ping_count += 1
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
