"""Configuration centralisée — HistoVision Pro.

Pattern Settings (pydantic-settings) : chaque réglage peut être surchargé
par une variable d'environnement préfixée HISTOVISION_ (voir .env.example).
Aucune valeur magique ailleurs dans le code — tout passe par ici.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Réglages applicatifs (bornes de performance — spec §3.3)."""

    model_config = SettingsConfigDict(
        env_prefix="HISTOVISION_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "HistoVision API"
    app_version: str = "1.0.0"

    # Persistance
    storage_dir: Path = Path("./storage")

    # Traitement image
    max_side: int = 1080        # downscale automatique (perf §3.3 : pas de crash en 4K)
    max_upload_mb: int = 20     # limite d'upload (413 au-delà)

    # API
    cors_origins: list[str] = [
        "http://localhost:5173",  # front Vite dev
        "http://localhost:3000",  # front React/Next
        "https://8753d196-cc2f-42a0-a586-540357edfef9.preview.qwenlm.io",  # preview Qwen
    ]  # front Vite

    @property
    def storage_path(self) -> Path:
        """Chemin de stockage, créé à la volée si absent."""
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        return self.storage_dir

    @property
    def db_path(self) -> Path:
        """Base SQLite, colocalisée avec le stockage des binaires."""
        return self.storage_path / "histovision.sqlite"


@lru_cache
def get_settings() -> Settings:
    """Singleton de configuration (injecté via FastAPI ``Depends``)."""
    return Settings()
