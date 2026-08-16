"""Routes jobs — consultation d'état des tâches asynchrones.

GET /api/jobs/{job_id}  ->  JobOut (statut, métriques, URL du résultat)

C'est l'endpoint que le front sonde toutes les 500 ms (hook useJob,
étape 11) jusqu'à l'état terminal ``done`` ou ``error``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_analysis_service
from app.application.dto import JobOut
from app.application.services.analysis_service import AnalysisService
from app.domain.entities import Job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobOut)
async def job_state(
    job_id: str,
    service: AnalysisService = Depends(get_analysis_service),
) -> JobOut:
    """État complet d'un job — métriques disponibles dès ``done``."""
    job = await service.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job inconnu : {job_id}")
    return _to_out(job)


def _to_out(job: Job) -> JobOut:
    """Mapping entité du domaine -> DTO publié."""
    return JobOut(
        id=job.id,
        kind=job.kind.value,
        status=job.status.value,
        image_id=job.image_id,
        palette_id=job.palette_id,
        metrics=job.metrics,
        result_url=f"/storage/results/{job.result_id}.png" if job.result_id else None,
        error=job.error,
        created_at=job.created_at,
    )
