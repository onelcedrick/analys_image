"""Forensique — DCT 8×8, divergence KL, heatmap de suspicion (F5, bonus).

Implémente la stratégie F5 du cahier des charges :

    chaque bloc 8×8 passe en DCT orthonormée (scipy.fft.dctn). Son
    histogramme de coefficients AC moyenne fréquence (3 <= u+v <= 6,
    soit 22 coefficients) est comparé au modèle global de l'image par
    divergence de Kullback-Leibler, complétée d'une pénalité d'excès de
    zéros — la signature des quantifications JPEG.

    Une zone rapportée (copier-coller, objet généré, double compression)
    a subi UNE quantification de plus que son voisinage : ses coefficients
    divergent du modèle global et s'illuminent sur la heatmap.

Score par bloc :  score = 1 - exp(-(KL + lambda * |dzr|))  dans [0, 1)
    - KL brut ~0.15-0.35 pour un bloc sain (biais d'estimation inclus) ;
    - score > 0.65  <=>  raw > ~1.05  : bloc déclaré suspect.
La heatmap est normalisée par percentiles (p5-p95) pour garder du
contraste même sur une image entièrement propre.
"""

from __future__ import annotations

import math

import cv2
import numpy as np
from scipy.fft import dctn

from app.domain.entities import AnalysisKind, DomainError
from app.domain.ports import ImageArray
from app.infrastructure.vision.images import encode_png

_BLOCK = 8
_BAND = [(u, v) for u in range(_BLOCK) for v in range(_BLOCK) if 3 <= u + v <= 6]
_BAND_U = np.array([u for u, v in _BAND])
_BAND_V = np.array([v for u, v in _BAND])
_N_COEFS = len(_BAND)                     # 22 coefficients moyenne fréquence

_COEF_RANGE = (-20.0, 20.0)
_DISPLAY_BINS = 41                        # pas de 1 — pour la métrique affichée
_KL_BINS = 8                              # pas de 5 — bins assez peuplés pour
                                          # 22 échantillons (biais de KL maîtrisé)
_ZERO_LAMBDA = 0.5                        # poids de l'excès de zéros
_FLAG_THRESHOLD = 0.65
_KL_EPS = 1e-3


class ForensicStrategy:
    """Moteur F5 — AnalysisStrategy basée sur la statistique DCT des blocs."""

    kind = AnalysisKind.FORENSIC

    def run(
        self,
        image: ImageArray,
        params: dict,
        palette: ImageArray | None = None,
    ) -> tuple[bytes, dict]:
        """Analyse forensique -> (PNG heatmap, métriques du domaine)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
        coeffs, bw, bh = extract_coefficients(gray)

        fine_hist, p_coarse, zero_ratio = global_model(coeffs)
        scores = score_blocks(coeffs, p_coarse, zero_ratio)
        grid = normalize_grid(scores, bw, bh)
        heatmap = render_heatmap(grid, image.shape)

        metrics = {
            "blocks_w": bw,
            "blocks_h": bh,
            "flagged_pct": round(100.0 * float((scores > _FLAG_THRESHOLD).mean()), 2),
            "mean_score": round(float(scores.mean()), 4),
            "coeff_hist": [int(v) for v in fine_hist],
            "heatmap": [[round(float(v), 3) for v in row] for row in grid],
        }
        return encode_png(heatmap), metrics


# ---------------------------------------------------------------------------
# Étapes pures — testées unitairement dans test_forensic.py
# ---------------------------------------------------------------------------

def extract_coefficients(gray: np.ndarray) -> tuple[np.ndarray, int, int]:
    """Découpe en blocs 8×8 (recadrage) et extrait les 22 coefs AC par bloc.

    :return: (coefficients (n_blocs, 22), blocs en largeur, blocs en hauteur)
    """
    height, width = gray.shape
    bh, bw = height // _BLOCK, width // _BLOCK
    if bw < 1 or bh < 1:
        raise DomainError("Image trop petite pour une analyse DCT 8×8")
    cropped = gray[: bh * _BLOCK, : bw * _BLOCK]
    blocks = (
        cropped.reshape(bh, _BLOCK, bw, _BLOCK)
        .transpose(0, 2, 1, 3)
        .reshape(-1, _BLOCK, _BLOCK)
    )
    coeffs = np.stack(
        [dctn(block, norm="ortho")[_BAND_U, _BAND_V] for block in blocks]
    )
    return coeffs, bw, bh


def global_model(coeffs: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """Modèle global de l'image : référence à laquelle comparer chaque bloc.

    :return: (histogramme fin 41 bins pour l'affichage,
              distribution grossière 8 bins pour le KL,
              ratio global de coefficients nuls)
    """
    flat = coeffs.ravel()
    fine, _ = np.histogram(flat, bins=_DISPLAY_BINS, range=_COEF_RANGE)
    coarse, _ = np.histogram(flat, bins=_KL_BINS, range=_COEF_RANGE)
    p_coarse = coarse.astype(np.float64)
    p_coarse /= p_coarse.sum()
    zero_ratio = float((flat == 0).mean())
    return fine, p_coarse, zero_ratio


def score_blocks(
    coeffs: np.ndarray, p_coarse: np.ndarray, zero_ratio: float
) -> np.ndarray:
    """Score de suspicion par bloc, saturé dans [0, 1)."""
    scores = np.empty(len(coeffs), dtype=np.float64)
    for i, row in enumerate(coeffs):
        q = np.histogram(row, bins=_KL_BINS, range=_COEF_RANGE)[0].astype(np.float64)
        q /= q.sum()
        kl = _kl_divergence(q, p_coarse)
        zero_penalty = _ZERO_LAMBDA * abs(float((row == 0).mean()) - zero_ratio)
        scores[i] = 1.0 - math.exp(-(kl + zero_penalty))
    return scores


def normalize_grid(scores: np.ndarray, bw: int, bh: int) -> np.ndarray:
    """Grille (bh, bw) normalisée p5-p95 — contraste garanti, même propre."""
    grid = scores.reshape(bh, bw)
    lo, hi = np.percentile(grid, [5.0, 95.0])
    if hi - lo < 1e-6:
        hi = lo + 1e-6
    return np.clip((grid - lo) / (hi - lo), 0.0, 1.0).astype(np.float32)


def render_heatmap(grid: np.ndarray, shape: tuple) -> np.ndarray:
    """Grille normalisée -> heatmap BGR à la taille de l'image (TURBO)."""
    height, width = shape[:2]
    norm = np.clip(grid * 255.0, 0.0, 255.0).astype(np.uint8)
    heat = cv2.applyColorMap(norm, cv2.COLORMAP_TURBO)
    return cv2.resize(heat, (width, height), interpolation=cv2.INTER_CUBIC)


def _kl_divergence(p: np.ndarray, q: np.ndarray) -> float:
    """KL(p || q) avec lissage — jamais infinie, toujours comparable."""
    p = np.clip(p, _KL_EPS, None)
    q = np.clip(q, _KL_EPS, None)
    p /= p.sum()
    q /= q.sum()
    return float(np.sum(p * np.log(p / q)))
