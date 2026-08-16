"""Histogrammes R·G·B + luminance — alimente GET /api/images/{id}/histogram (F1).

Fonction pure (sans état, sans variante) : pas de port dans le domaine,
l'application l'appelle directement — c'est assumé et documenté dans ports.py.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.domain.entities import HistogramPayload
from app.domain.ports import ImageArray

_RANGE = [0, 256]


def _hist256(img: ImageArray, channel: int) -> list[int]:
    return cv2.calcHist([img], [channel], None, [256], _RANGE).ravel().astype(int).tolist()


def compute_histogram(img: ImageArray) -> HistogramPayload:
    """Quatre distributions de 256 niveaux + statistiques globales.

    Les bins suivent l'ordre BGR d'OpenCV : canal 0 = bleu, 1 = vert, 2 = rouge.
    """
    red = _hist256(img, 2)
    green = _hist256(img, 1)
    blue = _hist256(img, 0)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    luminance = _hist256(gray.reshape(*gray.shape, 1), 0)

    n = float(img.shape[0] * img.shape[1])
    mean = float(gray.mean())
    std = float(gray.std())

    # Entropie de la luminance (bits/pixel) — richesse informationnelle.
    probs = np.asarray(luminance, dtype=np.float64) / n
    entropy = float(-(probs[probs > 0] * np.log2(probs[probs > 0])).sum())

    # Dynamique utile : percentiles p1 et p99 de la luminance.
    cum = np.cumsum(np.asarray(luminance))
    dynamic_low = int(min(np.searchsorted(cum, 0.01 * n), 255))
    dynamic_high = int(min(np.searchsorted(cum, 0.99 * n), 255))

    # Pixels saturés (écrêtés en <8 ou >247) — détecte surexposition/bouchage.
    clipped = int(np.count_nonzero((gray < 8) | (gray > 247)))

    return HistogramPayload(
        red=red,
        green=green,
        blue=blue,
        luminance=luminance,
        mean=round(mean, 2),
        std=round(std, 2),
        entropy=round(entropy, 3),
        dynamic_low=dynamic_low,
        dynamic_high=dynamic_high,
        clipped_pct=round(100.0 * clipped / n, 2),
    )
