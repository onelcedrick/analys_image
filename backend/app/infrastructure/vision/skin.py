"""Détection de peau — adaptateurs du port SkinDetector (F3).

Implémentation actuelle :
- YcbcrSkinDetector : classifieur de chrominance pur OpenCV, toujours dispo.

Évolution prévue (étape MediaPipe) :
- MediaPipeSkinDetector : segmentation selfie (CPU), plus précise sur les
  portraits. Le remplacement se fera d'UNE ligne dans dependencies.py —
  le moteur de transfert ne verra aucune différence (c'est tout le port).
"""

from __future__ import annotations

import cv2
import numpy as np

from app.domain.ports import ImageArray

# Fenêtre de chrominance de la peau humaine en YCbCr (plages classiques de
# la littérature) — robuste aux variations d'éclairage, indépendante de L.
_CB_RANGE = (77.0, 127.0)
_CR_RANGE = (133.0, 173.0)


class YcbcrSkinDetector:
    """Classifieur chrominance + nettoyage morphologique + feather gaussien."""

    def detect(self, image: ImageArray, feather_px: int) -> ImageArray:
        """Masque float32 0..1 — 1 = peau à protéger du transfert."""
        ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb).astype(np.float32)
        mask = (
            (ycrcb[..., 2] >= _CB_RANGE[0])
            & (ycrcb[..., 2] <= _CB_RANGE[1])
            & (ycrcb[..., 1] >= _CR_RANGE[0])
            & (ycrcb[..., 1] <= _CR_RANGE[1])
        ).astype(np.float32)

        # Nettoie le bruit sel/poivre : ouverture puis fermeture (5x5).
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        # Transition douce : le blending Lab évite toute démarcation nette.
        k = max(3, int(feather_px) * 2 + 1)
        return cv2.GaussianBlur(mask, (k, k), 0)
