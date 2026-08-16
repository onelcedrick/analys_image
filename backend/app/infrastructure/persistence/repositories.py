"""Implémentations SQLite des ports Repository du domaine.

Chaque repository traduit une entité <-> une ligne SQL. La sérialisation
JSON (params, metrics) se fait ICI, à la frontière : les entités du domaine
restent de pures dataclasses, sans aucun savoir-faire de persistance.
"""

from __future__ import annotations

import json

import aiosqlite

from app.domain.entities import AnalysisKind, ImageRef, Job, JobStatus
from app.infrastructure.persistence.database import Database


class SqliteImageRepository:
    """ImageRepository sur SQLite — registre des uploads."""

    def __init__(self, db: Database) -> None:
        self._db = db

    async def save(self, image: ImageRef) -> None:
        async with self._db.connect() as db:
            await db.execute(
                "INSERT INTO images (id, width, height, channels, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (image.id, image.width, image.height, image.channels, image.created_at),
            )

    async def get(self, image_id: str) -> ImageRef | None:
        async with self._db.connect() as db:
            cursor = await db.execute(
                "SELECT * FROM images WHERE id = ?", (image_id,)
            )
            row = await cursor.fetchone()
        return self._to_entity(row) if row else None

    async def list_all(self) -> list[ImageRef]:
        async with self._db.connect() as db:
            cursor = await db.execute(
                "SELECT * FROM images ORDER BY created_at DESC LIMIT 200"
            )
            rows = await cursor.fetchall()
        return [self._to_entity(row) for row in rows]

    @staticmethod
    def _to_entity(row: aiosqlite.Row) -> ImageRef:
        return ImageRef(
            id=row["id"],
            width=row["width"],
            height=row["height"],
            channels=row["channels"],
            created_at=row["created_at"],
        )


class SqliteJobRepository:
    """JobRepository sur SQLite — suivi des tâches d'analyse."""

    def __init__(self, db: Database) -> None:
        self._db = db

    async def save(self, job: Job) -> None:
        async with self._db.connect() as db:
            await db.execute(
                "INSERT INTO jobs (id, kind, image_id, palette_id, status,"
                " params, metrics, result_id, error, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    job.id,
                    job.kind.value,
                    job.image_id,
                    job.palette_id,
                    job.status.value,
                    json.dumps(job.params),
                    json.dumps(job.metrics),
                    job.result_id,
                    job.error,
                    job.created_at,
                ),
            )

    async def get(self, job_id: str) -> Job | None:
        async with self._db.connect() as db:
            cursor = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
            row = await cursor.fetchone()
        return self._to_entity(row) if row else None

    async def update(self, job: Job) -> None:
        """Réécrit l'état mutable (statut, métriques, résultat, erreur)."""
        async with self._db.connect() as db:
            await db.execute(
                "UPDATE jobs SET status = ?, params = ?, metrics = ?,"
                " result_id = ?, error = ? WHERE id = ?",
                (
                    job.status.value,
                    json.dumps(job.params),
                    json.dumps(job.metrics),
                    job.result_id,
                    job.error,
                    job.id,
                ),
            )

    @staticmethod
    def _to_entity(row: aiosqlite.Row) -> Job:
        return Job(
            id=row["id"],
            kind=AnalysisKind(row["kind"]),
            image_id=row["image_id"],
            status=JobStatus(row["status"]),
            palette_id=row["palette_id"],
            params=json.loads(row["params"]),
            metrics=json.loads(row["metrics"]),
            result_id=row["result_id"],
            error=row["error"],
            created_at=row["created_at"],
        )
