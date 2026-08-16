"""Bootstrap FastAPI — HistoVision Pro.

Clean Architecture : ce module ne fait qu'ASSEMBLER les couches.
    api (livraison HTTP)  ->  application (cas d'usage)  ->  domain (métier)
                                    ^
                     infrastructure (adaptateurs : OpenCV, POT, SQLite...)

On n'y trouve donc aucune logique métier — seulement la fabrique
d'application (pattern Factory), le middleware CORS et les montages.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import analysis, health, images, jobs, images
from app.config import get_settings
from app.infrastructure.persistence.database import Database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cycle de vie : démarrage (stockage, puis DB/worker aux étapes suivantes)."""
    settings = get_settings()
    settings.storage_path  # crée ./storage si absent
    yield


def create_app() -> FastAPI:
    """Fabrique d'application — testable et réutilisable (pytest, ASGI)."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Analyse histogrammique : transfert optimal (POT), texture (CLAHE/bilatéral), forensique (DCT 8x8).",
        lifespan=lifespan,
    )

    # Le front Vite (React) tourne sur :5173 — on autorise ses appels.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers (un par ressource — livrés au fil des étapes) ──────────
    app.include_router(health.router, prefix="/api")
    app.include_router(images.router, prefix="/api")
    app.include_router(analysis.router, prefix="/api")
    app.include_router(jobs.router, prefix="/api")

    # Les vignettes / résultats PNG sont servis en statique.
    app.mount("/storage", StaticFiles(directory=settings.storage_path), name="storage")

    return app


app = create_app()
