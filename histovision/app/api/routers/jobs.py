"""Routes jobs — état + téléchargement du PNG résultat."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.api.dependencies import get_analysis_service, get_file_store
from app.application.dto import JobOut
from app.application.services.analysis_service import AnalysisService
from app.domain.entities import Job
from app.domain.ports import FileStore

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobOut)
async def job_state(
    job_id: str,
    service: AnalysisService = Depends(get_analysis_service),
) -> JobOut:
    job = await service.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job inconnu : {job_id}")
    return _to_out(job)


@router.get("/{job_id}/result")
async def job_result_png(
    job_id: str,
    service: AnalysisService = Depends(get_analysis_service),
    store: FileStore = Depends(get_file_store),
) -> Response:
    """Sert le PNG depuis le FileStore (disque ou Cloudinary)."""
    job = await service.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job inconnu : {job_id}")
    if job.status.value != "done" or not job.result_id:
        raise HTTPException(status_code=404, detail="Résultat pas encore disponible")

    metrics = job.metrics or {}
    key = metrics.get("result_key") if isinstance(metrics.get("result_key"), str) else f"results/{job.result_id}.png"

    try:
        data = store.read_bytes(key)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Fichier résultat absent : {exc}") from exc

    return Response(content=data, media_type="image/png", headers={"Cache-Control": "no-store"})


def _to_out(job: Job) -> JobOut:
    metrics = job.metrics or {}
    stored = metrics.get("result_url") if isinstance(metrics, dict) else None
    if isinstance(stored, str) and stored.startswith("http"):
        result_url = stored
    elif job.result_id:
        result_url = f"/api/jobs/{job.id}/result"
    else:
        result_url = None

    return JobOut(
        id=job.id,
        kind=job.kind.value,
        status=job.status.value,
        image_id=job.image_id,
        palette_id=job.palette_id,
        metrics=metrics,
        result_url=result_url,
        error=job.error,
        created_at=job.created_at,
    )
