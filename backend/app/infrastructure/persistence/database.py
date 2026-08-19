"""SQLite (aiosqlite) ou PostgreSQL (asyncpg) — schéma et gestion des connexions.

Le backend reste compatible avec le même port Repository. L'adaptateur
choisit le bon moteur selon la configuration, sans changer les services
métier.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite
import asyncpg

_SCHEMA = """
CREATE TABLE IF NOT EXISTS images (
    id         TEXT PRIMARY KEY,
    width      INTEGER NOT NULL,
    height     INTEGER NOT NULL,
    channels   INTEGER NOT NULL,
    created_at DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,
    image_id   TEXT NOT NULL REFERENCES images(id),
    palette_id TEXT REFERENCES images(id),
    status     TEXT NOT NULL,
    params     TEXT NOT NULL DEFAULT '{}',
    metrics    TEXT NOT NULL DEFAULT '{}',
    result_id  TEXT,
    error      TEXT,
    created_at DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON jobs(status);
"""


class Database:
    """Gestionnaire de connexion SQLite ou PostgreSQL."""

    def __init__(self, *, path: Path | None = None, dsn: str | None = None, backend: str = "sqlite"):
        self.backend = backend.lower()
        self._path = Path(path) if path is not None else None
        self._dsn = dsn
        if self._path is not None:
            self._path.parent.mkdir(parents=True, exist_ok=True)

    @classmethod
    def from_settings(cls, settings) -> "Database":
        backend = (getattr(settings, "database_backend", "sqlite") or "sqlite").lower()
        if backend in {"postgres", "postgresql", "neon"}:
            return cls(backend="postgres", dsn=getattr(settings, "database_url", None))
        return cls(backend="sqlite", path=getattr(settings, "db_path", settings.storage_path / "histovision.sqlite"))

    async def init(self) -> None:
        """Crée le schéma du moteur actif."""
        if self.backend in {"postgres", "postgresql", "neon"}:
            if not self._dsn:
                raise ValueError("PostgreSQL DSN is required when database_backend is postgres")
            conn = await asyncpg.connect(self._dsn)
            try:
                await conn.execute(_SCHEMA)
            finally:
                await conn.close()
            return

        async with aiosqlite.connect(self._path) as db:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.execute("PRAGMA foreign_keys=ON")
            await db.executescript(_SCHEMA)
            await db.commit()

    @asynccontextmanager
    async def connect(self):
        """Contexte transactionnel : commit si succès, rollback sinon."""
        if self.backend in {"postgres", "postgresql", "neon"}:
            if not self._dsn:
                raise ValueError("PostgreSQL DSN is required when database_backend is postgres")
            conn = await asyncpg.connect(self._dsn)
            try:
                yield conn
                await conn.execute("COMMIT")
            except Exception:
                await conn.execute("ROLLBACK")
                raise
            finally:
                await conn.close()
            return

        db = await aiosqlite.connect(self._path)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys=ON")
        try:
            yield db
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        finally:
            await db.close()
