"""Tests du moteur forensic — F5 : DCT 8×8, KL, détection de double compression.

Le cas truqué est construit proprement : un patch est compressé SEUL
(qualité 50) puis recollé dans une image compressée à 88 — c'est la
signature classique du copier-coller JPEG.

Lancer depuis backend/ :  pytest app/tests -v
"""

import cv2
import numpy as np
import pytest

from app.domain.entities import AnalysisKind, DomainError
from app.infrastructure.vision.forensic import (
    ForensicStrategy,
    extract_coefficients,
    global_model,
    score_blocks,
)
from app.infrastructure.vision.images import decode_image


def _jpeg_round(img, quality):
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    assert ok
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def _content(seed, w=256, h=192):
    """Contenu riche en fréquences (bruit lissé) — indispensable à la DCT."""
    rng = np.random.default_rng(seed)
    img = np.clip(rng.normal(128, 45, (h, w, 3)), 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(img, (3, 3), 0)


def _clean(seed=0):
    return _jpeg_round(_content(seed), 88)


def _tampered(seed=0, y=64, x=96, s=64):
    """Le patch subit une compression de plus que le reste : double compression."""
    base = _content(seed)
    clean = _jpeg_round(base, 88)
    patch = _jpeg_round(base[y:y + s, x:x + s], 50)
    out = clean.copy()
    out[y:y + s, x:x + s] = patch
    return _jpeg_round(out, 88), (y, x, s)


# ---------------------------------------------------------------------------
# Contrat de stratégie
# ---------------------------------------------------------------------------

def test_kind_de_la_strategie():
    assert ForensicStrategy.kind is AnalysisKind.FORENSIC


def test_image_trop_petite_refusee():
    with pytest.raises(DomainError, match="petite"):
        ForensicStrategy().run(np.zeros((6, 6, 3), np.uint8), {})


# ---------------------------------------------------------------------------
# Extraction et modèle
# ---------------------------------------------------------------------------

def test_grille_de_blocs_et_22_coefficients():
    gray = cv2.cvtColor(_clean(), cv2.COLOR_BGR2GRAY).astype(np.float32)
    coeffs, bw, bh = extract_coefficients(gray)
    assert (bw, bh) == (32, 24)          # 256/8 × 192/8
    assert coeffs.shape == (32 * 24, 22)


# ---------------------------------------------------------------------------
# Détection
# ---------------------------------------------------------------------------

def test_image_propre_presque_aucun_bloc_suspect():
    _, metrics = ForensicStrategy().run(_clean(seed=1), {})
    assert metrics["flagged_pct"] < 15.0


def test_double_compression_locale_est_reperee():
    """Les blocs du patch truqué doivent scorer nettement plus haut."""
    img, (y, x, s) = _tampered()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    coeffs, bw, bh = extract_coefficients(gray)
    _, p_coarse, zero_ratio = global_model(coeffs)
    scores = score_blocks(coeffs, p_coarse, zero_ratio).reshape(bh, bw)

    patch = scores[y // 8:(y + s) // 8, x // 8:(x + s) // 8]
    outside = np.ones_like(scores, dtype=bool)
    outside[y // 8:(y + s) // 8, x // 8:(x + s) // 8] = False

    assert patch.mean() > 1.5 * scores[outside].mean()


# ---------------------------------------------------------------------------
# Métriques et sortie
# ---------------------------------------------------------------------------

def test_contrat_metriques_et_heatmap():
    img, _ = _tampered()
    png, metrics = ForensicStrategy().run(img, {})

    result = decode_image(png)
    assert result.shape == img.shape              # heatmap à la taille de l'image

    assert metrics["blocks_w"] == 32
    assert metrics["blocks_h"] == 24
    assert len(metrics["coeff_hist"]) == 41       # pas de 1 sur [-20, 20]
    assert 0.0 <= metrics["mean_score"] <= 1.0
    assert len(metrics["heatmap"]) == 24
    assert len(metrics["heatmap"][0]) == 32
    values = [v for row in metrics["heatmap"] for v in row]
    assert min(values) >= 0.0 and max(values) <= 1.0
