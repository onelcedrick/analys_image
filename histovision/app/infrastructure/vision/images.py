"""Entrées/sorties image — adaptateur OpenCV (implémente le port ImageLoader).

Responsabilités, et rien d'autre :
- octets  -> ndarray  (imdecode) ;
- ndarray -> octets   (imencode PNG/JPEG) ;
- downscale <= max_side   (perf §3.3 : pas de crash sur du 4K) ;
- vignette carrée 256 px  (banque d'images du front).

Tout le reste du backend manipule des ndarray BGR uint8 : c'est LE format
de référence, celui natif d'OpenCV.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.domain.entities import DomainError, ImageRef
from app.domain.ports import FileStore, ImageArray


def decode_image(raw: bytes) -> ImageArray:
    """Décode des octets JPEG/PNG en tableau BGR uint8."""
    buffer = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if img is None:
        raise DomainError(
            "Contenu illisible : le fichier n'est pas une image JPEG/PNG valide"
        )
    return img


def encode_png(img: ImageArray) -> bytes:
    """Encode un tableau en PNG sans perte (images et résultats)."""
    ok, buffer = cv2.imencode(".png", img)
    if not ok:
        raise DomainError("Encodage PNG impossible")
    return buffer.tobytes()


def encode_jpeg(img: ImageArray, quality: int = 85) -> bytes:
    """Encode un tableau en JPEG (vignettes légères)."""
    ok, buffer = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise DomainError("Encodage JPEG impossible")
    return buffer.tobytes()


def downscale(img: ImageArray, max_side: int) -> ImageArray:
    """Ramène le plus grand côté à <= max_side, en conservant le ratio.

    INTER_AREA : le bon interpolateur pour réduire (pas d'aliasing).
    """
    height, width = img.shape[:2]
    scale = min(1.0, max_side / max(height, width))
    if scale >= 1.0:
        return img
    new_w = max(1, round(width * scale))
    new_h = max(1, round(height * scale))
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def make_thumbnail(img: ImageArray, side: int = 256) -> ImageArray:
    """Vignette carrée par recadrage centré (couverture, pas de bandes)."""
    height, width = img.shape[:2]
    s = min(height, width)
    y, x = (height - s) // 2, (width - s) // 2
    square = img[y : y + s, x : x + s]
    return cv2.resize(square, (side, side), interpolation=cv2.INTER_AREA)


class CvImageLoader:
    """Port ImageLoader : ImageRef -> ndarray via le FileStore."""

    def __init__(self, store: FileStore) -> None:
        self._store = store

    def load(self, image: ImageRef) -> ImageArray:
        """Relit l'original normalisé persisté à l'upload."""
        return decode_image(self._store.read_bytes(f"images/{image.id}.png"))
