"""Espace CIE Lab (illuminant D65) — conversions sRGB réversibles.

OpenCV travaille en float32 sur [0, 1] pour entrer et sortir :
- BGR2Lab : L dans [0, 100], a/b dans environ [-127, 127] ;
- Lab2BGR : BGR float [0, 1], remis en uint8 avec écrêtage.

C'est LE point de passage de tout le pipeline couleur (F2) : le transfert
optimal opère sur ces canaux, pas sur le RVB — c'est ce qui évite les
dérives de teinte et rend le transport perceptuellement cohérent.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.domain.ports import ImageArray


def bgr_to_lab(image: ImageArray) -> np.ndarray:
    """BGR uint8 -> Lab float32 (L 0..100, a/b environ -127..127)."""
    normalized = image.astype(np.float32) / 255.0
    return cv2.cvtColor(normalized, cv2.COLOR_BGR2Lab)


def lab_to_bgr(lab: np.ndarray) -> ImageArray:
    """Lab float32 -> BGR uint8, avec écrêtage dans le gamut sRGB."""
    bgr = cv2.cvtColor(lab.astype(np.float32), cv2.COLOR_Lab2BGR)
    return np.clip(bgr * 255.0, 0.0, 255.0).astype(np.uint8)
