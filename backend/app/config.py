"""Configuration centralisée — HistoVision Pro.

Pattern Settings (pydantic-settings) : chaque réglage peut être surchargé
par une variable d'environnement préfixée HISTOVISION_ (voir .env.example).
Aucune valeur magique ailleurs dans le code — tout passe par ici.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
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

    # Sécurité
    secret_key: str = "dev-secret-key-change-me"
    jwt_algorithm: str = "HS256"

    # Persistance
    storage_dir: Path = Path("./storage")
    storage_backend: str = Field(default="local", validation_alias="HISTOVISION_STORAGE_BACKEND")

    # Cloudinary
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "histovision"

    # Neon / Postgres
    database_backend: str = Field(default="sqlite", validation_alias="HISTOVISION_DATABASE_BACKEND")
    database_url: str | None = Field(default=None, validation_alias="HISTOVISION_DATABASE_URL")

    # Traitement image
    max_side: int = 1080        # downscale automatique (perf §3.3 : pas de crash en 4K)
    max_upload_mb: int = 20     # limite d'upload (413 au-delà)

    # API
    api_base_url: str = "http://127.0.0.1:8000"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",  # front Vite dev # front React/Next
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
