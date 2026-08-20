"""Cas d'usage image — upload (F1) et histogrammes.

Orchestration pure : garde-fous -> décodage -> downscale -> persistance
-> enregistrement. Ce service ne connaît ni les codes HTTP (c'est le rôle
du router), ni les internals d'OpenCV (c'est le rôle des adaptateurs vision).

Les erreurs métier spécifiques (UnsupportedFormat, ImageTooLarge) héritent
de DomainError : le router les traduit en 415 / 413 / 422.
"""

from __future__ import annotations

from app.domain.entities import DomainError, HistogramPayload, ImageRef, new_id
from app.domain.ports import FileStore, ImageLoader, ImageRepository
from app.infrastructure.vision.histogram import compute_histogram
from app.infrastructure.vision.images import (
    decode_image,
    downscale,
    encode_jpeg,
    encode_png,
    make_thumbnail,
)

_ACCEPTED_CONTENT_TYPES = {"image/jpeg", "image/png"}
_THUMB_SIDE = 256


class UnsupportedFormat(DomainError):
    """Fichier ni JPEG ni PNG — traduite en HTTP 415 par le router."""


class ImageTooLarge(DomainError):
    """Fichier au-dessus de la limite configurée — traduite en HTTP 413."""


class ImageService:
    """Service applicatif — assemblé par injection dans api/dependencies.py."""

    def __init__(
        self,
        store: FileStore,
        images: ImageRepository,
        loader: ImageLoader,
        max_side: int,
        max_upload_mb: int,
    ) -> None:
        self._store = store
        self._images = images
        self._loader = loader
        self._max_side = max_side
        self._max_upload_mb = max_upload_mb

    # -- cas d'usage -----------------------------------------------------------

    async def register(self, raw: bytes, content_type: str | None) -> ImageRef:
        """Fichier reçu -> PNG normalisé + vignette JPEG + ImageRef persistée."""
        self._guard(raw, content_type)

        img = downscale(decode_image(raw), self._max_side)
        height, width = img.shape[:2]
        ref = ImageRef(id=new_id(), width=width, height=height, channels=3)

        # L'original est ré-encodé en PNG : stockage normalisé, lecture unique.
        self._store.save_bytes(f"images/{ref.id}.png", encode_png(img))
        self._store.save_bytes(
            f"thumbs/{ref.id}.jpg",
            encode_jpeg(make_thumbnail(img, _THUMB_SIDE)),
        )
        await self._images.save(ref)
        return ref

    async def get(self, image_id: str) -> ImageRef | None:
        return await self._images.get(image_id)

    async def list_all(self) -> list[ImageRef]:
        return await self._images.list_all()

    def histogram(self, image: ImageRef) -> HistogramPayload:
        """Distributions R·G·B + luminance de l'image persistée."""
        return compute_histogram(self._loader.load(image))

    # -- interne ---------------------------------------------------------------

    def _guard(self, raw: bytes, content_type: str | None) -> None:
        """Valide AVANT tout décodage : on ne paie pas cv2 pour un refus."""
        mime = (content_type or "").split(";", 1)[0].strip().lower()
        if mime and mime not in _ACCEPTED_CONTENT_TYPES:
            raise UnsupportedFormat(
                f"Format refusé : {mime or 'inconnu'} (JPG/PNG uniquement)"
            )
        limit = self._max_upload_mb * 1024 * 1024
        if len(raw) > limit:
            raise ImageTooLarge(
                f"Fichier de {len(raw) / 1e6:.1f} Mo — limite {self._max_upload_mb} Mo"
            )
