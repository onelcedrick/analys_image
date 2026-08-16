"""Routes images — fonctionnalité F1 du cahier des charges.

POST /api/images                       upload multipart    -> 201 ImageMeta
GET  /api/images                       banque d'images     -> ImageListOut
GET  /api/images/{image_id}            carte d'identité    -> ImageMeta
GET  /api/images/{image_id}/histogram  distributions RVB   -> HistogramOut

Le router est volontairement mince : traduction DomainError -> statut HTTP,
mapping entités -> DTO, et rien d'autre.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.api.dependencies import get_image_service
from app.application.dto import HistogramOut, ImageListOut, ImageMeta
from app.application.services.image_service import (
    ImageService,
    ImageTooLarge,
    UnsupportedFormat,
)
from app.domain.entities import DomainError, ImageRef

router = APIRouter(prefix="/images", tags=["images"])


@router.post("", response_model=ImageMeta, status_code=201)
async def upload_image(
    file: UploadFile,
    service: ImageService = Depends(get_image_service),
) -> ImageMeta:
    """Reçoit un fichier, le normalise (<= 1080 px) et le référence."""
    raw = await file.read()
    try:
        ref = await service.register(raw, file.content_type)
    except ImageTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except UnsupportedFormat as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except DomainError as exc:  # contenu illisible, etc.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _to_meta(ref)


@router.get("", response_model=ImageListOut)
async def list_images(
    service: ImageService = Depends(get_image_service),
) -> ImageListOut:
    """Banque d'images pour la sidebar du front."""
    refs = await service.list_all()
    return ImageListOut(images=[_to_meta(ref) for ref in refs])


@router.get("/{image_id}/histogram", response_model=HistogramOut)
async def image_histogram(
    image_id: str,
    service: ImageService = Depends(get_image_service),
) -> HistogramOut:
    """Histogrammes R·G·B + luminance et statistiques globales."""
    image = await _require(service, image_id)
    payload = service.histogram(image)
    return HistogramOut.model_validate(payload, from_attributes=True)


@router.get("/{image_id}", response_model=ImageMeta)
async def image_meta(
    image_id: str,
    service: ImageService = Depends(get_image_service),
) -> ImageMeta:
    """Carte d'identité d'une image."""
    return _to_meta(await _require(service, image_id))


# -- interne -------------------------------------------------------------------


async def _require(service: ImageService, image_id: str) -> ImageRef:
    """Charge une image ou lève un 404 explicite."""
    image = await service.get(image_id)
    if image is None:
        raise HTTPException(status_code=404, detail=f"Image inconnue : {image_id}")
    return image


def _to_meta(ref: ImageRef) -> ImageMeta:
    """Mapping entité du domaine -> DTO publié."""
    return ImageMeta(
        id=ref.id,
        width=ref.width,
        height=ref.height,
        channels=ref.channels,
        megapixels=ref.megapixels,
        thumb_url=f"/storage/thumbs/{ref.id}.jpg",
        image_url=f"/storage/images/{ref.id}.png",
        created_at=ref.created_at,
    )
