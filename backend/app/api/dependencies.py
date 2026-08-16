"""Injection de dépendances — le point d'assemblage unique des adaptateurs.

Les routers ne construisent JAMAIS un adaptateur : ils le reçoivent via
``Depends``. Conséquences :
- un seul endroit pour câbler SQLite / FileStore / OpenCV ;
- les tests remplacent n'importe quelle pièce (override_dependency) ;
- la composition respecte la règle des dépendances (api -> application,
  infrastructure fournie de l'extérieur).
"""

from __future__ import annotations

from fastapi import Request

from app.application.services.analysis_service import AnalysisService
from app.application.services.image_service import ImageService
from app.config import get_settings
from app.infrastructure.jobs.executor import InProcessJobExecutor
from app.infrastructure.persistence.database import Database
from app.infrastructure.persistence.file_storage import DiskFileStore
from app.infrastructure.persistence.repositories import (
    SqliteImageRepository,
    SqliteJobRepository,
)
from app.infrastructure.vision.images import CvImageLoader
from app.infrastructure.vision.skin import YcbcrSkinDetector
from app.infrastructure.vision.texture import TextureStrategy
from app.infrastructure.vision.transfer import TransferStrategy


def get_database(request: Request) -> Database:
    """Base initialisée au démarrage (lifespan de main.py)."""
    return request.app.state.database


def get_image_service(request: Request) -> ImageService:
    """Compose le service image à partir des réglages et de la base."""
    settings = get_settings()
    store = DiskFileStore(settings.storage_path)
    return ImageService(
        store=store,
        images=SqliteImageRepository(request.app.state.database),
        loader=CvImageLoader(store),
        max_side=settings.max_side,
        max_upload_mb=settings.max_upload_mb,
    )



def get_analysis_service(request: Request) -> AnalysisService:
    """Compose le service d'analyse : dépôts + exécuteur + stratégies.

    Le registre des stratégies grandira aux étapes 7 (texture) et
    8 (forensic) : une seule ligne à ajouter ici, rien d'autre ne bouge
    (pattern Strategy). Le détecteur de peau est le port SkinDetector —
    YCbCr aujourd'hui, MediaPipe demain, zéro changement dans le moteur.
    """
    settings = get_settings()
    store = DiskFileStore(settings.storage_path)
    database = request.app.state.database
    images = SqliteImageRepository(database)
    jobs = SqliteJobRepository(database)
    executor = InProcessJobExecutor(
        strategies={
            TransferStrategy.kind: TransferStrategy(skin=YcbcrSkinDetector()),
            TextureStrategy.kind: TextureStrategy(),
        },
        images=images,
        jobs=jobs,
        loader=CvImageLoader(store),
        store=store,
    )
    return AnalysisService(jobs=jobs, images=images, executor=executor)
