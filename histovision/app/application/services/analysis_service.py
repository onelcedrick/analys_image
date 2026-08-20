"""Cas d'usage analyse — accepter une demande, tracer un Job, déléguer.

Le service ne sait ni QUAND le calcul tournera (l'exécuteur en décide),
ni COMMENT (la stratégie l'implémente) : il crée le Job dans son état
initial et le confie au port JobExecutor. Ce découplage est ce qui rend
le passage à arq/Redis (étape 11) transparent pour cette couche.
"""

from __future__ import annotations

from app.domain.entities import AnalysisKind, DomainError, Job, new_id
from app.domain.ports import ImageRepository, JobExecutor, JobRepository


class ImageNotFound(DomainError):
    """Image référencée absente du registre — traduite en HTTP 404."""


class AnalysisService:
    """Orchestre la soumission des analyses (F2, F4, F5)."""

    def __init__(
        self,
        jobs: JobRepository,
        images: ImageRepository,
        executor: JobExecutor,
    ) -> None:
        self._jobs = jobs
        self._images = images
        self._executor = executor

    # -- soumissions ---------------------------------------------------------

    async def submit_transfer(self, image_id: str, palette_id: str, params: dict) -> Job:
        """F2 + F3 : deux images requises (cible + source de palette)."""
        await self._require_image(image_id)
        await self._require_image(palette_id)
        return await self._submit(
            AnalysisKind.TRANSFER, image_id, {**params, "palette_id": palette_id}
        )

    async def submit_texture(self, image_id: str, params: dict) -> Job:
        """F4 — le moteur sera câblé à l'étape 7 (le Job, lui, fonctionne déjà)."""
        await self._require_image(image_id)
        return await self._submit(AnalysisKind.TEXTURE, image_id, params)

    async def submit_forensic(self, image_id: str, params: dict) -> Job:
        """F5 — le moteur sera câblé à l'étape 8."""
        await self._require_image(image_id)
        return await self._submit(AnalysisKind.FORENSIC, image_id, params)

    # -- lecture ---------------------------------------------------------------

    async def get(self, job_id: str) -> Job | None:
        return await self._jobs.get(job_id)

    # -- interne ---------------------------------------------------------------

    async def _submit(self, kind: AnalysisKind, image_id: str, params: dict) -> Job:
        """Crée le Job (état initial du domaine) puis le confie à l'exécuteur."""
        job = Job(
            id=new_id(),
            kind=kind,
            image_id=image_id,
            palette_id=params.get("palette_id"),
            params=params,
        )
        await self._jobs.save(job)
        await self._executor.execute(job)
        return job

    async def _require_image(self, image_id: str) -> None:
        if await self._images.get(image_id) is None:
            raise ImageNotFound(f"Image inconnue : {image_id}")
