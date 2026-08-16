"""Route de santé — sondée par le front pour basculer serveur / navigateur.

GET /api/health  ->  {"status": "ok", "version": "1.0.0"}
"""

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Indique que l'API est vivante et laquelle tourne."""
    settings = get_settings()
    return {"status": "ok", "version": settings.app_version}
