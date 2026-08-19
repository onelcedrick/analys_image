"""Bootstrap FastAPI — HistoVision Pro."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import analysis, health, images, jobs
from app.config import get_settings
from app.infrastructure.persistence.database import Database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Stockage disque + schéma SQLite (requis pour upload / jobs)."""
    settings = get_settings()
    settings.storage_path
    db = Database(settings.db_path)
    await db.init()
    app.state.database = db
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Analyse histogrammique : transfert optimal (POT), texture (CLAHE/bilatéral), forensique (DCT 8x8).",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(images.router, prefix="/api")
    app.include_router(analysis.router, prefix="/api")
    app.include_router(jobs.router, prefix="/api")

    app.mount("/storage", StaticFiles(directory=str(settings.storage_path)), name="storage")

    return app


app = create_app()
