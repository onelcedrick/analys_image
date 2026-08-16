"""Transfert chromatique par transport optimal — POT (ot.emd2).

Implémente la stratégie F2 du cahier des charges :

    la palette de la source est TRANSPORTÉE vers la cible canal par canal
    en espace CIE Lab, via le plan de transport optimal (théorème de
    Brenier — en 1D, l'appariement des quantiles EST la carte optimale).

Ce que produit run() :
- le PNG résultat (transfert + blending d'intensité + protection peau) ;
- les métriques du domaine : distances W2 par canal, courbes LUT (256 pts),
  % de peau protégée.

La protection sémantique (F3) est injectée : le détecteur de peau est un
port du domaine (SkinDetector), câblé par l'application — ce module ne
sait ni ne veut savoir si c'est MediaPipe ou un repli YCbCr derrière.
"""

from __future__ import annotations

import math

import numpy as np
import ot

from app.domain.entities import AnalysisKind, DomainError
from app.domain.ports import ImageArray, SkinDetector
from app.infrastructure.vision.color_space import bgr_to_lab, lab_to_bgr
from app.infrastructure.vision.images import encode_png

_BINS = 256

# Plages réelles des canaux Lab float32 d'OpenCV.
_RANGES: dict[str, tuple[float, float]] = {
    "L": (0.0, 100.0),
    "a": (-128.0, 127.0),
    "b": (-128.0, 127.0),
}


class TransferStrategy:
    """Moteur F2 — AnalysisStrategy basée sur le transport optimal."""

    kind = AnalysisKind.TRANSFER

    def __init__(self, skin: SkinDetector | None = None) -> None:
        """skin : détecteur optionnel ; requis si skin_protect=True."""
        self._skin = skin

    def run(
        self,
        image: ImageArray,
        params: dict,
        palette: ImageArray | None = None,
    ) -> tuple[bytes, dict]:
        """Transfert de palette -> (PNG résultat, métriques du domaine)."""
        if palette is None:
            raise DomainError("Le transfert exige une image palette")

        strength = float(params.get("strength", 0.85))
        skin_protect = bool(params.get("skin_protect", False))
        feather = int(params.get("feather", 14))

        target = bgr_to_lab(image)
        source = bgr_to_lab(palette)

        mask = None
        if skin_protect:
            if self._skin is None:
                raise DomainError(
                    "Protection demandée mais aucun détecteur de peau n'est câblé"
                )
            mask = self._skin.detect(image, feather)  # float32 0..1, 1 = peau

        out = np.empty_like(target)
        w2: dict[str, float] = {}
        luts: dict[str, list[float]] = {}

        for idx, name in enumerate(("L", "a", "b")):
            lo, hi = _RANGES[name]
            lut, distance = optimal_map_1d(
                source[..., idx].ravel(), target[..., idx].ravel(), (lo, hi)
            )
            luts[name] = [round(float(v), 3) for v in lut]
            w2[name] = round(distance, 3)

            mapped = _apply_lut(target[..., idx], lut, (lo, hi))
            blended = (1.0 - strength) * target[..., idx] + strength * mapped
            if mask is not None:
                # F3 : la peau garde SES valeurs, le fond est transporté.
                blended = mask * target[..., idx] + (1.0 - mask) * blended
            out[..., idx] = blended.astype(np.float32)

        metrics = {
            "w2": w2,
            "luts": luts,
            "skin_pct": round(float(mask.mean()) * 100.0, 2) if mask is not None else 0.0,
        }
        return encode_png(lab_to_bgr(out)), metrics


# ---------------------------------------------------------------------------
# Transport optimal 1D — le cœur mathématique
# ---------------------------------------------------------------------------

def optimal_map_1d(
    source: np.ndarray,
    target: np.ndarray,
    value_range: tuple[float, float],
    bins: int = _BINS,
) -> tuple[np.ndarray, float]:
    """Carte de transport optimale 1D + distance de Wasserstein-2.

    Résout le problème de Monge-Kantorovich discret entre les histogrammes
    des deux distributions (ot.emd pour le plan, ot.emd2 pour le coût),
    puis projette chaque bin de la cible sur le barycentre de ses
    destinations dans la source (T#mu_cible = mu_source : la cible
    acquiert la distribution de la source — c'est le transfert de palette).

    :return: (LUT de `bins` valeurs dans le domaine réel, distance W2 réelle)
    """
    lo, hi = value_range
    hist_s, _ = np.histogram(source, bins=bins, range=(lo, hi))
    hist_t, _ = np.histogram(target, bins=bins, range=(lo, hi))

    p_s = hist_s.astype(np.float64)
    p_t = hist_t.astype(np.float64)
    # Une masse nulle ferait échouer ot.emd : on bascule sur l'uniforme.
    if p_s.sum() == 0:
        p_s = np.full(bins, 1.0 / bins)
    if p_t.sum() == 0:
        p_t = np.full(bins, 1.0 / bins)
    p_s /= p_s.sum()
    p_t /= p_t.sum()

    grid = np.arange(bins, dtype=np.float64)
    cost_matrix = (grid[:, None] - grid[None, :]) ** 2  # coût quadratique -> W2

    w2_squared_bins = float(ot.emd2(p_t, p_s, cost_matrix))
    plan = ot.emd(p_t, p_s, cost_matrix)  # lignes = cible, colonnes = source

    row_mass = plan.sum(axis=1)
    lut_bins = np.where(
        row_mass > 0,
        (plan @ grid) / np.maximum(row_mass, 1e-12),
        grid,  # bin cible vide -> identité
    )

    scale = (hi - lo) / (bins - 1)
    lut = (lo + lut_bins * scale).astype(np.float32)
    w2 = math.sqrt(max(w2_squared_bins, 0.0)) * scale
    return lut, w2


def _apply_lut(
    channel: np.ndarray,
    lut: np.ndarray,
    value_range: tuple[float, float],
    bins: int = _BINS,
) -> np.ndarray:
    """Applique la LUT à un canal : valeur -> bin -> valeur transportée."""
    lo, hi = value_range
    idx = ((channel - lo) / (hi - lo) * (bins - 1)).round().astype(np.int64)
    np.clip(idx, 0, bins - 1, out=idx)
    return lut[idx]
