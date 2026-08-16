"""Amélioration locale — histogramme conjoint, Otsu, CLAHE, bilatéral (F4).

Implémente la stratégie F4 du cahier des charges :

    chaque pixel vote dans le plan (intensité, gradient). Le seuil d'Otsu
    sépare les deux populations : CLAHE renforce les zones texturées
    (herbe, cheveux, tissu), le filtre bilatéral adoucit les zones lisses
    (ciel, peau). Un masque featheré fusionne les deux voies, et le
    curseur d'intensité global rapproche le résultat de l'original.

Métriques du domaine renvoyées :
- otsu_threshold : seuil en unités réelles de gradient ;
- textured_pct   : % de pixels classés texturés (avant feather) ;
- joint_histogram: carte conjointe 32×32 log-normalisée (0..1),
  lignes = gradient, colonnes = intensité.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.domain.entities import AnalysisKind
from app.domain.ports import ImageArray
from app.infrastructure.vision.images import encode_png

_JOINT_BINS = 32      # résolution de la carte conjointe (métrique du domaine)
_MASK_FEATHER = 6     # px — transition douce entre zones lisses / texturées
_GRAD_EPS = 1e-3      # en dessous, l'image est considérée parfaitement plate


class TextureStrategy:
    """Moteur F4 — AnalysisStrategy basée sur l'histogramme conjoint."""

    kind = AnalysisKind.TEXTURE

    def run(
        self,
        image: ImageArray,
        params: dict,
        palette: ImageArray | None = None,
    ) -> tuple[bytes, dict]:
        """Amélioration locale -> (PNG résultat, métriques du domaine)."""
        clip = float(params.get("clip", 2.6))
        smooth = float(params.get("smooth", 26.0))
        blend = float(params.get("blend", 0.85))

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
        grad = _sobel_magnitude(gray)

        joint = _joint_histogram(gray, grad)
        otsu = _otsu_threshold(grad)

        # Classification binaire puis feather : pas de frontière nette.
        if float(grad.max()) < _GRAD_EPS:
            textured = np.zeros_like(grad)  # image plate -> tout est lisse
        else:
            textured = (grad >= otsu).astype(np.float32)
        textured_pct = round(float(textured.mean()) * 100.0, 2)

        k = _MASK_FEATHER * 2 + 1
        mask = cv2.GaussianBlur(textured, (k, k), 0)[..., None]  # H×W×1

        # Voie texturée : CLAHE sur le canal L seul (la chroma n'est pas touchée).
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
        lab[..., 0] = clahe.apply(lab[..., 0])
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR).astype(np.float32)

        # Voie lisse : bilatéral (d=0 -> diamètre dérivé des sigmas).
        smoothed = cv2.bilateralFilter(
            image, d=0, sigmaColor=smooth, sigmaSpace=smooth
        ).astype(np.float32)

        base = image.astype(np.float32)
        combined = mask * enhanced + (1.0 - mask) * smoothed
        result = (1.0 - blend) * base + blend * combined
        result_u8 = np.clip(result, 0.0, 255.0).astype(np.uint8)

        metrics = {
            "otsu_threshold": round(float(otsu), 3),
            "textured_pct": textured_pct,
            "joint_histogram": [
                [round(float(v), 4) for v in row] for row in joint
            ],
        }
        return encode_png(result_u8), metrics


# ---------------------------------------------------------------------------
# Outils — gradient, carte conjointe, Otsu
# ---------------------------------------------------------------------------

def _sobel_magnitude(gray: np.ndarray) -> np.ndarray:
    """Magnitude du gradient de Sobel 3×3, ramenée à l'échelle des niveaux."""
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    return cv2.magnitude(gx, gy) / 4.0


def _joint_histogram(
    gray: np.ndarray, grad: np.ndarray, bins: int = _JOINT_BINS
) -> np.ndarray:
    """Carte conjointe 32×32 (lignes = gradient, colonnes = intensité).

    L'axe gradient est normalisé par son percentile 95 (robuste aux pics
    isolés), puis la carte est log-normalisée : les modes dominants ne
    noient pas les populations secondaires.
    """
    gmax = float(np.percentile(grad, 95.0)) if grad.size else 0.0
    gmax = max(gmax, _GRAD_EPS)
    gy = np.clip(grad / gmax * bins, 0.0, bins - 1e-9)

    counts, _, _ = np.histogram2d(
        gray.ravel(), gy.ravel(), bins=bins, range=[[0.0, 256.0], [0.0, float(bins)]]
    )
    joint = counts.T  # lignes = gradient, colonnes = intensité
    peak = float(joint.max())
    if peak <= 0:
        return np.zeros((bins, bins), dtype=np.float32)
    return (np.log1p(joint) / np.log1p(peak)).astype(np.float32)


def _otsu_threshold(values: np.ndarray, bins: int = 256) -> float:
    """Seuil d'Otsu (variance inter-classe) — NumPy pur.

    Même critère que cv2.threshold(..., THRESH_OTSU), mais rendu dans
    l'unité réelle des valeurs (ici : le gradient), pas en 0..255.
    """
    if values.size == 0 or float(values.max()) < _GRAD_EPS:
        return 0.0
    hist, edges = np.histogram(values, bins=bins)
    centers = (edges[:-1] + edges[1:]) / 2.0
    prob = hist.astype(np.float64)
    prob /= prob.sum()

    omega = np.cumsum(prob)                         # masse cumulée
    mu = np.cumsum(prob * centers)                  # moment cumulé
    mu_total = mu[-1]
    denom = omega * (1.0 - omega)
    denom = np.where(denom > 1e-12, denom, np.inf)  # classes vides -> score nul
    sigma_b2 = (mu_total * omega - mu) ** 2 / denom
    return float(centers[int(np.argmax(sigma_b2))])
