"""Tests du moteur texture — F4 : histogramme conjoint, Otsu, CLAHE, bilatéral.

Comme pour le transfert, on vérifie des PROPRIÉTÉS sur des images de
synthèse aux populations contrôlées (plate, échiquier, bruit).

Lancer depuis backend/ :  pytest app/tests -v
"""

import cv2
import numpy as np
import pytest

from app.domain.entities import AnalysisKind
from app.infrastructure.vision.images import decode_image
from app.infrastructure.vision.texture import TextureStrategy


def _flat(color=(120, 120, 120), w=96, h=72):
    """Image parfaitement plate — gradient nul partout."""
    return np.full((h, w, 3), color, dtype=np.uint8)


def _checkerboard(w=128, h=128, cell=8):
    """Échiquier — alternance de bords nets très texturés."""
    yy, xx = np.mgrid[0:h, 0:w]
    board = ((((xx // cell) + (yy // cell)) % 2) * 255).astype(np.uint8)
    return cv2.cvtColor(board, cv2.COLOR_GRAY2BGR)


def _noise(w=128, h=96, seed=3):
    """Bruit légèrement flouté — texture fine et répartie."""
    rng = np.random.default_rng(seed)
    img = np.clip(rng.normal(128, 25, (h, w, 3)), 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(img, (3, 3), 0)


def _run(image, **params):
    base = {"clip": 2.6, "smooth": 26, "blend": 0.85}
    base.update(params)
    png, metrics = TextureStrategy().run(image, base)
    return decode_image(png), metrics


# ---------------------------------------------------------------------------
# Contrat de stratégie
# ---------------------------------------------------------------------------

def test_kind_de_la_strategie():
    assert TextureStrategy.kind is AnalysisKind.TEXTURE


def test_palette_ignoree():
    """F4 n'utilise pas de palette — en fournir une ne change rien."""
    img = _noise()
    avec, m1 = _run(img)
    sans, m2 = TextureStrategy().run(
        img, {"clip": 2.6, "smooth": 26, "blend": 0.85}, palette=_flat()
    )
    sans = decode_image(sans)  # run() rend des octets PNG, pas un tableau
    assert m1 == m2
    assert np.array_equal(avec, sans)


# ---------------------------------------------------------------------------
# Curseur d'intensité
# ---------------------------------------------------------------------------

def test_blend_zero_ne_change_rien():
    img = _checkerboard()
    result, _ = _run(img, blend=0.0)
    assert np.abs(result.astype(int) - img.astype(int)).mean() < 1.5


# ---------------------------------------------------------------------------
# Classification lisse / texturé
# ---------------------------------------------------------------------------

def test_image_plate_classee_entierement_lisse():
    result, metrics = _run(_flat())
    assert metrics["textured_pct"] == 0.0
    assert metrics["otsu_threshold"] == 0.0
    # voie lisse sur une image plate = identité
    assert np.abs(result.astype(int) - 120).mean() < 1.0


def test_image_texturee_classee_comme_telle():
    _, metrics = _run(_checkerboard())
    assert metrics["textured_pct"] > 15.0


def test_otsu_est_dans_une_plage_saine():
    _, metrics = _run(_noise())
    assert 0.0 < metrics["otsu_threshold"] < 60.0


# ---------------------------------------------------------------------------
# Métriques de la carte conjointe
# ---------------------------------------------------------------------------

def test_joint_histogram_32x32_normalise():
    _, metrics = _run(_noise())
    joint = metrics["joint_histogram"]
    assert len(joint) == 32
    assert all(len(row) == 32 for row in joint)
    values = [v for row in joint for v in row]
    assert min(values) >= 0.0
    assert max(values) == pytest.approx(1.0, abs=1e-3)  # log-normalisation


# ---------------------------------------------------------------------------
# Effet visible du moteur
# ---------------------------------------------------------------------------

def test_structure_modifiee_de_maniere_mesurable():
    img = _noise()
    result, _ = _run(img)
    assert np.abs(result.astype(int) - img.astype(int)).mean() > 1.0
