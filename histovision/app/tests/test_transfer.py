"""Tests du moteur de transfert — transport optimal, Lab, protection peau.

On vérifie des PROPRIÉTÉS (réversibilité, identité, monotonie du transport)
plutôt que des pixels exacts : c'est robuste et ça documente le contrat.

Lancer depuis backend/ :  pytest app/tests -v
"""

import cv2
import numpy as np
import pytest

from app.domain.entities import AnalysisKind, DomainError
from app.infrastructure.vision.color_space import bgr_to_lab, lab_to_bgr
from app.infrastructure.vision.images import decode_image
from app.infrastructure.vision.transfer import TransferStrategy, optimal_map_1d


def _flat(color_bgr, w=64, h=48):
    """Image unie — histogramme trivial, idéal pour raisonner sur le transport."""
    return np.full((h, w, 3), color_bgr, dtype=np.uint8)


def _gradient(w=128, h=96):
    """Dégradé de gris : couvre toute la dynamique de L*."""
    ramp = np.linspace(10, 240, w, dtype=np.uint8)
    gray = np.tile(ramp, (h, 1))
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


def _run(target, source, **params):
    strategy = TransferStrategy()
    base = {"strength": 0.85, "skin_protect": False, "feather": 14}
    base.update(params)
    png, metrics = strategy.run(target, base, palette=source)
    return decode_image(png), metrics


# ---------------------------------------------------------------------------
# Espace couleur
# ---------------------------------------------------------------------------

def test_aller_retour_lab_preserve_l_image():
    img = _gradient()
    back = lab_to_bgr(bgr_to_lab(img))
    assert np.abs(back.astype(int) - img.astype(int)).mean() < 1.0


# ---------------------------------------------------------------------------
# Transport optimal 1D
# ---------------------------------------------------------------------------

def test_auto_transport_est_l_identite():
    vals = np.random.default_rng(0).uniform(0, 100, 5000)
    lut, w2 = optimal_map_1d(vals, vals.copy(), (0.0, 100.0))
    assert w2 == pytest.approx(0.0, abs=1e-6)
    assert np.abs(lut - np.linspace(0, 100, 256)).max() < 1.0


def test_transport_decale_la_distribution():
    """Deux gaussiennes décalées de 40 : la LUT transporte 30 -> 70, W2 = 40."""
    rng = np.random.default_rng(1)
    sombre = rng.normal(30, 5, 8000)
    clair = rng.normal(70, 5, 8000)
    lut, w2 = optimal_map_1d(clair, sombre, (0.0, 100.0))
    assert lut[int(30 / 100 * 255)] == pytest.approx(70.0, abs=3.0)
    assert w2 == pytest.approx(40.0, abs=3.0)


# ---------------------------------------------------------------------------
# Stratégie de transfert
# ---------------------------------------------------------------------------

def test_transfert_rapproche_la_luminance_de_la_source():
    result, metrics = _run(_flat((30, 30, 30)), _flat((210, 210, 210)))
    assert result.mean() > 150  # nettement éclaircie
    assert metrics["w2"]["L"] > 0
    assert len(metrics["luts"]["L"]) == 256
    assert metrics["skin_pct"] == 0.0


def test_strength_zero_ne_change_rien():
    cible = _gradient()
    result, _ = _run(cible, _flat((200, 80, 40)), strength=0.0)
    assert np.abs(result.astype(int) - cible.astype(int)).mean() < 2.0


def test_auto_transfert_preserve_l_image():
    img = _gradient()
    result, metrics = _run(img, img.copy())
    assert metrics["w2"]["L"] == pytest.approx(0.0, abs=1e-3)
    assert np.abs(result.astype(int) - img.astype(int)).mean() < 2.0


def test_masque_de_peau_protege_la_zone():
    """Un masque stub à 1 partout doit laisser l'image intacte (F3)."""

    class StubSkin:
        def detect(self, image, feather_px):
            return np.ones(image.shape[:2], dtype=np.float32)

    png, metrics = TransferStrategy(skin=StubSkin()).run(
        _flat((30, 30, 30)),
        {"strength": 1.0, "skin_protect": True, "feather": 5},
        palette=_flat((210, 210, 210)),
    )
    assert metrics["skin_pct"] == 100.0
    assert np.abs(decode_image(png).astype(int) - 30).mean() < 2.0


def test_protection_sans_detecteur_leve_une_erreur_metier():
    with pytest.raises(DomainError, match="détecteur"):
        TransferStrategy().run(
            _flat((30, 30, 30)),
            {"strength": 0.85, "skin_protect": True},
            palette=_flat((200, 200, 200)),
        )


def test_palette_manquante_leve_une_erreur_metier():
    with pytest.raises(DomainError, match="palette"):
        TransferStrategy().run(_flat((30, 30, 30)), {"strength": 0.85})


def test_kind_de_la_strategie():
    assert TransferStrategy.kind is AnalysisKind.TRANSFER
