"""Exécuteur de Jobs — implémente le port JobExecutor du domaine.

Version "in process" : le calcul est filé immédiatement à une tâche asyncio
(``asyncio.to_thread`` libère la boucle, les moteurs étant du CPU pur).
Le contrat est IDENTIQUE à celui du futur exécuteur arq : le reste du code
ne verra pas la différence à l'étape 11.

Responsabilités :
- sélectionner la stratégie dans le registre (pattern Strategy) ;
- charger les images via les ports du domaine ;
- piloter la machine à états du Job (start -> complete | fail) ;
- persister le PNG résultat (+ vignette) et les métriques.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Mapping

from app.domain.entities import AnalysisKind, DomainError, ImageRef, Job
from app.domain.ports import (
    AnalysisStrategy,
    FileStore,
    ImageLoader,
    ImageRepository,
    JobRepository,
)
from app.infrastructure.vision.images import (
    decode_image,
    encode_jpeg,
    make_thumbnail,
)

log = logging.getLogger(__name__)


class InProcessJobExecutor:
    """JobExecutor synchrone-au-boot, asynchrone-en-fond."""

    def __init__(
        self,
        strategies: Mapping[AnalysisKind, AnalysisStrategy],
        images: ImageRepository,
        jobs: JobRepository,
        loader: ImageLoader,
        store: FileStore,
    ) -> None:
        self._strategies = strategies
        self._images = images
        self._jobs = jobs
        self._loader = loader
        self._store = store
        self._tasks: set[asyncio.Task] = set()  # empêche le GC des tâches vives

    async def execute(self, job: Job) -> None:
        """Accepte le job et le file hors de la requête HTTP (fire & forget)."""
        task = asyncio.create_task(self._run(job))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    # -- interne ---------------------------------------------------------------

    async def _run(self, job: Job) -> None:
        """Fait vivre la machine à états du domaine jusqu'à l'état terminal."""
        try:
            job.start()
            await self._jobs.update(job)

            image = await self._require(self._images.get(job.image_id), job.image_id)
            palette: ImageRef | None = None
            if job.palette_id:
                palette = await self._require(
                    self._images.get(job.palette_id), job.palette_id
                )

            strategy = self._strategies.get(job.kind)
            if strategy is None:
                raise DomainError(
                    f"Moteur '{job.kind.value}' pas encore câblé (étape suivante)"
                )

            png, metrics = await asyncio.to_thread(
                self._compute, strategy, image, palette, job.params
            )

            result_url = self._store.save_bytes(f"results/{job.id}.png", png)
            self._store.save_bytes(
                f"thumbs/{job.id}.jpg",
                encode_jpeg(make_thumbnail(decode_image(png))),
            )
            metrics = {**(metrics or {}), "result_url": result_url, "result_key": f"results/{job.id}.png"}
            job.complete(result_id=job.id, metrics=metrics)
        except Exception as exc:  # noqa: BLE001 — un job ne tue jamais le serveur
            log.exception("Échec du job %s", job.id)
            job.fail(str(exc))
        await self._jobs.update(job)

    @staticmethod
    async def _require(awaitable, image_id: str) -> ImageRef:
        ref = await awaitable
        if ref is None:
            raise DomainError(f"Image introuvable : {image_id}")
        return ref

    def _compute(
        self,
        strategy: AnalysisStrategy,
        image: ImageRef,
        palette: ImageRef | None,
        params: dict,
    ) -> tuple[bytes, dict]:
        """Tourne dans un thread dédié (to_thread) — moteurs 100 % CPU."""
        target = self._loader.load(image)
        source = self._loader.load(palette) if palette is not None else None
        return strategy.run(target, params, palette=source)
