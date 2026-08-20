"""Routes d'analyse — acceptation des demandes et création des Jobs.

POST /api/transfer   -> 202 JobRefOut   (F2 + F3)
POST /api/texture    -> 202 JobRefOut   (moteur câblé à l'étape 7)
POST /api/forensic   -> 202 JobRefOut   (moteur câblé à l'étape 8)

HTTP 202 « Accepted » : la demande est validée et tracée, le calcul est
différé (exécuteur in-process aujourd'hui, file arq demain — le contrat
ne change pas, c'est tout l'intérêt du port JobExecutor).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_analysis_service
from app.application.dto import (
    ForensicRequest,
    JobRefOut,
    TextureRequest,
    TransferRequest,
)
from app.application.services.analysis_service import (
    AnalysisService,
    ImageNotFound,
)
from app.domain.entities import Job

router = APIRouter(tags=["analysis"])


@router.post("/transfer", response_model=JobRefOut, status_code=202)
async def request_transfer(
    req: TransferRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> JobRefOut:
    """F2 + F3 : transporte la palette de `palette_id` vers `image_id`."""
    try:
        job = await service.submit_transfer(
            req.image_id,
            req.palette_id,
            req.model_dump(exclude={"image_id", "palette_id"}),
        )
    except ImageNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _accepted(job)


@router.post("/texture", response_model=JobRefOut, status_code=202)
async def request_texture(
    req: TextureRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> JobRefOut:
    """F4 : amélioration locale CLAHE/bilatéral (moteur à l'étape 7)."""
    try:
        job = await service.submit_texture(
            req.image_id, req.model_dump(exclude={"image_id"})
        )
    except ImageNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _accepted(job)


@router.post("/forensic", response_model=JobRefOut, status_code=202)
async def request_forensic(
    req: ForensicRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> JobRefOut:
    """F5 : analyse forensique DCT 8x8 (moteur à l'étape 8)."""
    try:
        job = await service.submit_forensic(req.image_id, {})
    except ImageNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _accepted(job)


def _accepted(job: Job) -> JobRefOut:
    """Accusé de réception uniforme (202)."""
    return JobRefOut(job_id=job.id, status=job.status.value)
