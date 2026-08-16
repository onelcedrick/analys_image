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

Sens du transport (à lire absolument avant de toucher à optimal_map_1d) :
    la LUT est indexée par les pixels que l'on TRANSFORME (la cible) et
    renvoie, pour chacun, la valeur qui le rapproche de la distribution
    À ATTEINDRE (la palette). Appliquée à la cible, elle lui donne la
    distribution de la palette : c'est le transfert de palette.
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

        target = bgr_to_lab(image)    # l'image que l'on recolorie
        source = bgr_to_lab(palette)  # la palette que l'on veut obtenir

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
            # Appel par MOTS-CLÉS : le sens du transport est ici indiscutable.
            # On déplace les pixels de la CIBLE vers la distribution de la SOURCE.
            lut, distance = optimal_map_1d(
                to_reach=source[..., idx].ravel(),
                to_move=target[..., idx].ravel(),
                value_range=(lo, hi),
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
    to_reach: np.ndarray,
    to_move: np.ndarray,
    value_range: tuple[float, float],
    bins: int = _BINS,
) -> tuple[np.ndarray, float]:
    """Carte de transport optimale 1D + distance de Wasserstein-2.

    Construit la LUT qui, appliquée aux valeurs de ``to_move`` (la cible),
    leur donne la distribution de ``to_reach`` (la palette). C'est le
    transfert de palette : T#mu_cible = mu_source.

    Résout le problème de Monge-Kantorovich discret entre les histogrammes
    (ot.emd pour le plan, ot.emd2 pour le coût quadratique), puis projette
    chaque bin de la cible sur le barycentre de ses destinations dans la
    source. Les lignes du plan portent la masse À DÉPLACER (cible), les
    colonnes sont les destinations (source).

    :param to_reach: valeurs 1D de la distribution cible du transport (palette)
    :param to_move:  valeurs 1D que l'on transforme (image à recolorer)
    :return: (LUT de `bins` valeurs dans le domaine réel, distance W2 réelle)
    """
    lo, hi = value_range
    hist_reach, _ = np.histogram(to_reach, bins=bins, range=(lo, hi))  # destinations
    hist_move, _ = np.histogram(to_move, bins=bins, range=(lo, hi))    # masse à déplacer

    p_reach = hist_reach.astype(np.float64)
    p_move = hist_move.astype(np.float64)
    # Une masse nulle ferait échouer ot.emd : on bascule sur l'uniforme.
    if p_reach.sum() == 0:
        p_reach = np.full(bins, 1.0 / bins)
    if p_move.sum() == 0:
        p_move = np.full(bins, 1.0 / bins)
    p_reach /= p_reach.sum()
    p_move /= p_move.sum()

    grid = np.arange(bins, dtype=np.float64)
    cost_matrix = (grid[:, None] - grid[None, :]) ** 2  # coût quadratique -> W2

    # ot.emd(a, b) : les LIGNES somment à a. On veut les lignes = bins cible
    # (masse à déplacer), les colonnes = bins source (destinations).
    w2_squared_bins = float(ot.emd2(p_move, p_reach, cost_matrix))
    plan = ot.emd(p_move, p_reach, cost_matrix)

    row_mass = plan.sum(axis=1)  # masse par bin CIBLE
    lut_bins = np.where(
        row_mass > 0,
        (plan @ grid) / np.maximum(row_mass, 1e-12),  # barycentre des destinations
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
