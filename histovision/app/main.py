"""Bootstrap FastAPI — HistoVision Pro (API + SPA en production)."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routers import analysis, health, images, jobs
from app.config import get_settings
from app.infrastructure.persistence.database import Database

# Dossier frontend build (Docker multi-stage copie ici)
_STATIC_DIR = Path(os.environ.get("HISTOVISION_STATIC_DIR", str(Path(__file__).resolve().parents[2] / "static")))


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.storage_path
    db = Database.from_settings(settings)
    await db.init()
    app.state.database = db
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Analyse histogrammique : transfert optimal (POT), texture, forensique DCT.",
        lifespan=lifespan,
    )

    # CORS : liste config + wildcard pour Spaces HF / previews
    origins = list(settings.cors_origins)
    for extra in (
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:7860",
        "http://localhost:7860",
    ):
        if extra not in origins:
            origins.append(extra)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.(hf\.space|huggingface\.co)",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(images.router, prefix="/api")
    app.include_router(analysis.router, prefix="/api")
    app.include_router(jobs.router, prefix="/api")

    storage = settings.storage_path
    app.mount("/storage", StaticFiles(directory=str(storage)), name="storage")

    # SPA React (build Vite) si présent — production / Hugging Face
    if _STATIC_DIR.is_dir() and (_STATIC_DIR / "index.html").exists():
        assets = _STATIC_DIR / "assets"
        if assets.is_dir():
            app.mount("/assets", StaticFiles(directory=str(assets)), name="assets")

        @app.get("/{full_path:path}")
        async def spa_fallback(full_path: str):
            # Ne pas masquer l'API / storage
            if full_path.startswith("api/") or full_path.startswith("storage/"):
                return {"detail": "Not Found"}
            candidate = _STATIC_DIR / full_path
            if full_path and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(_STATIC_DIR / "index.html")

    return app


app = create_app()
