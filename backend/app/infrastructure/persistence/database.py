"""SQLite (aiosqlite) — schéma et gestion des connexions.

Aucune logique métier ici : cet adaptateur sait créer les tables,
ouvrir des connexions transactionnelles et rien d'autre.

Choix techniques :
- WAL        : lecture concurrente pendant qu'un worker écrit (étape 9) ;
- JSON TEXT  : params/metrics — simple, lisible, suffisant pour un POC ;
- clés FK    : un job ne peut jamais référencer une image inexistante.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite

_SCHEMA = """
CREATE TABLE IF NOT EXISTS images (
    id         TEXT PRIMARY KEY,
    width      INTEGER NOT NULL,
    height     INTEGER NOT NULL,
    channels   INTEGER NOT NULL,
    created_at REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,                -- transfer | texture | forensic
    image_id   TEXT NOT NULL REFERENCES images(id),
    palette_id TEXT REFERENCES images(id),
    status     TEXT NOT NULL,                -- queued | running | done | error
    params     TEXT NOT NULL DEFAULT '{}',   -- curseurs utilisateur (JSON)
    metrics    TEXT NOT NULL DEFAULT '{}',   -- W2, skin_pct, otsu... (JSON)
    result_id  TEXT,                         -- clé du PNG résultat dans le FileStore
    error      TEXT,
    created_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON jobs(status);
"""


class Database:
    """Gestionnaire de connexion SQLite — un fichier, mode WAL."""

    def __init__(self, path: Path):
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)

    async def init(self) -> None:
        """Crée le schéma (idempotent) et active WAL + clés étrangères."""
        async with aiosqlite.connect(self._path) as db:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.execute("PRAGMA foreign_keys=ON")
            await db.executescript(_SCHEMA)
            await db.commit()

    @asynccontextmanager
    async def connect(self):
        """Contexte transactionnel : commit si succès, rollback sinon."""
        db = await aiosqlite.connect(self._path)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys=ON")  # requis à chaque connexion
        try:
            yield db
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        finally:
            await db.close()
