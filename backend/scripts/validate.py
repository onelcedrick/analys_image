"""Vérification des critères d'acceptation — §7 du cahier des charges.

Aucun serveur requis : le script attaque directement les moteurs (le même
code que celui servi par l'API). Il affiche un tableau succès/échec avec
les mesures et renvoie un code de sortie 0/1 — branchable dans une CI.

Lancer depuis backend/ :  python scripts/validate.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.infrastructure.vision.color_space import bgr_to_lab
from app.infrastructure.vision.forensic import (
    ForensicStrategy,
    extract_coefficients,
    global_model,
    score_blocks,
)
from app.infrastructure.vision.histogram import compute_histogram
from app.infrastructure.vision.images import decode_image, downscale
from app.infrastructure.vision.skin import YcbcrSkinDetector
from app.infrastructure.vision.texture import TextureStrategy
from app.infrastructure.vision.transfer import TransferStrategy, optimal_map_1d

ROWS: list[tuple[str, bool, str]] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    ROWS.append((label, bool(ok), detail))


def noise(w=320, h=240, seed=0, sigma=45):
    rng = np.random.default_rng(seed)
    img = np.clip(rng.normal(128, sigma, (h, w, 3)), 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(img, (3, 3), 0)


def flat(color, w=96, h=72):
    return np.full((h, w, 3), color, dtype=np.uint8)


def gradient(w=256, h=64):
    ramp = np.linspace(0, 255, w, dtype=np.uint8)
    return cv2.cvtColor(np.tile(ramp, (h, 1)), cv2.COLOR_GRAY2BGR)


def split_image(w=256, h=192, seed=1):
    img = np.full((h, w, 3), 200, np.uint8)
    rng = np.random.default_rng(seed)
    zone = np.clip(rng.normal(110, 45, (h, w // 2, 3)), 0, 255).astype(np.uint8)
    img[:, w // 2 :] = cv2.GaussianBlur(zone, (3, 3), 0)
    return img


def jpeg(img, q):
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), q])
    assert ok
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def tampered(seed=2, w=320, h=256):
    base = np.clip(np.random.default_rng(seed).normal(128, 45, (h, w, 3)), 0, 255).astype(np.uint8)
    base = cv2.GaussianBlur(base, (3, 3), 0)
    out = jpeg(base, 88)
    out[96:176, 128:224] = jpeg(base[96:176, 128:224], 45)
    return jpeg(out, 88), (96, 128, 80, 96)


def run(strategy, img, params, palette=None):
    t0 = time.perf_counter()
    png, metrics = strategy.run(img, params, palette=palette)
    return decode_image(png), metrics, time.perf_counter() - t0


def c1_histogram() -> None:
    img = noise()
    h = compute_histogram(img)
    n = img.shape[0] * img.shape[1]
    ok_bins = all(len(getattr(h, c)) == 256 for c in ("red", "green", "blue", "luminance"))
    ok_sum = all(sum(getattr(h, c)) == n for c in ("red", "green", "blue", "luminance"))
    ok_stats = 0 <= h.mean <= 255 and h.entropy > 0 and h.dynamic_low <= h.dynamic_high
    check("F1 — 4×256 bins, totaux et statistiques cohérents",
          ok_bins and ok_sum and ok_stats, f"μ={h.mean} · H={h.entropy} bits")


def c2_transfer() -> None:
    cible, source = gradient(), flat((210, 210, 210))
    result, metrics, _ = run(TransferStrategy(), cible,
                             {"strength": 1.0, "skin_protect": False}, palette=source)

    monotones = all(np.all(np.diff(metrics["luts"][c]) >= -1e-3) for c in ("L", "a", "b"))
    steps = max(float(np.max(np.abs(np.diff(metrics["luts"][c])))) for c in ("L", "a", "b"))
    check("F2 — LUT monotones et continues (zéro artefact de bloc)",
          monotones and steps < 25.0, f"saut LUT max = {steps:.1f}")

    src_L = bgr_to_lab(source)[..., 0].ravel()
    res_L = bgr_to_lab(result)[..., 0].ravel()
    _, w2_after = optimal_map_1d(to_reach=src_L, to_move=res_L, value_range=(0.0, 100.0))
    check("F2 — la distribution résultante épouse la palette",
          w2_after < 5.0, f"W₂ résiduel = {w2_after:.2f}")


def c3_skin() -> None:
    class StubToutPeau:
        def detect(self, image, feather_px):
            return np.ones(image.shape[:2], dtype=np.float32)

    class StubDemiPeau:
        def detect(self, image, feather_px):
            m = np.zeros(image.shape[:2], dtype=np.float32)
            m[:, : image.shape[1] // 2] = 1.0
            return m

    cible = flat((30, 30, 30), 128, 96)
    palette = flat((210, 210, 210), 128, 96)
    params = {"strength": 1.0, "skin_protect": True, "feather": 6}

    res_full, m_full, _ = run(TransferStrategy(skin=StubToutPeau()), cible, params, palette=palette)
    residu = float(np.abs(res_full.astype(int) - 30).mean())
    check("F3 — peau entièrement masquée : teint intact",
          residu < 2.0 and m_full["skin_pct"] == 100.0, f"écart moyen = {residu:.2f}")

    res_half, _, _ = run(TransferStrategy(skin=StubDemiPeau()), cible, params, palette=palette)
    gauche = float(np.abs(res_half[:, :32].astype(int) - 30).mean())
    droite = float(np.abs(res_half[:, -32:].astype(int) - 30).mean())
    check("F3 — moitié protégée préservée / moitié fond transportée",
          gauche < 5.0 and droite > 50.0, f"protégée={gauche:.1f} · transportée={droite:.1f}")

    mask = YcbcrSkinDetector().detect(flat((120, 140, 200), 64, 48), 10)
    ok = mask.dtype == np.float32 and float(mask.min()) >= 0.0 and float(mask.max()) <= 1.0
    check("F3 — détecteur YCbCr : masque featheré dans [0,1]", ok, f"max={float(mask.max()):.2f}")


def c4_texture() -> None:
    img = split_image()
    result, metrics, _ = run(TextureStrategy(), img, {"clip": 3.0, "smooth": 30, "blend": 1.0})

    h, w = img.shape[:2]
    plate_apres = float(result[:, : w // 4].astype(np.float32).std())
    tex_avant = float(img[:, -w // 4 :].astype(np.float32).std())
    tex_apres = float(result[:, -w // 4 :].astype(np.float32).std())

    check("F4 — la zone lisse reste douce (bilatéral)", plate_apres < 6.0, f"σ après={plate_apres:.1f}")
    check("F4 — la zone texturée gagne en contraste local (CLAHE)",
          tex_apres >= tex_avant, f"σ {tex_avant:.1f} → {tex_apres:.1f}")
    ok = metrics["otsu_threshold"] > 0.0 and 15.0 <= metrics["textured_pct"] <= 85.0
    check("F4 — partition d'Otsu plausible", ok,
          f"seuil={metrics['otsu_threshold']} · texturé={metrics['textured_pct']}%")


def c5_forensic() -> None:
    img, (y, x, sy, sx) = tampered()
    _, metrics, _ = run(ForensicStrategy(), img, {})

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    coeffs, bw, bh = extract_coefficients(gray)
    _, p, z = global_model(coeffs)
    scores = score_blocks(coeffs, p, z).reshape(bh, bw)
    patch = scores[y // 8 : (y + sy) // 8, x // 8 : (x + sx) // 8]
    outside = np.ones_like(scores, dtype=bool)
    outside[y // 8 : (y + sy) // 8, x // 8 : (x + sx) // 8] = False
    ratio = float(patch.mean() / max(float(scores[outside].mean()), 1e-9))

    check("F5 — la zone double-compressée score plus haut", ratio > 1.5, f"ratio = {ratio:.2f}")
    check("F5 — contrat de métriques (grille, histogramme, score)",
          len(metrics["coeff_hist"]) == 41 and metrics["blocks_w"] == bw
          and 0.0 <= metrics["mean_score"] <= 1.0, f"suspects={metrics['flagged_pct']}%")


def c6_performance() -> None:
    rng = np.random.default_rng(3)
    big = np.clip(rng.normal(128, 45, (2160, 3840, 3)), 0, 255).astype(np.uint8)  # 4K
    scaled = downscale(big, 1080)

    _, _, t_transfer = run(TransferStrategy(skin=YcbcrSkinDetector()), scaled,
                           {"strength": 0.85, "skin_protect": True, "feather": 14},
                           palette=noise(640, 480))
    check("Perf §3.3 — transfert 4K (downscale + OT + peau) < 5 s", t_transfer < 5.0, f"{t_transfer:.2f} s")

    _, _, t_texture = run(TextureStrategy(), scaled, {"clip": 2.6, "smooth": 26, "blend": 0.85})
    check("Perf §3.3 — texture 1080p (CLAHE + bilatéral) < 5 s", t_texture < 5.0, f"{t_texture:.2f} s")

    _, _, t_forensic = run(ForensicStrategy(), scaled, {})
    check("Perf §3.3 — forensic DCT 1080p < 5 s", t_forensic < 5.0, f"{t_forensic:.2f} s")


def main() -> None:
    print("=" * 80)
    print("  HistoVision Pro — vérification des critères d'acceptation (§7)")
    print("=" * 80)
    t0 = time.perf_counter()
    for fn in (c1_histogram, c2_transfer, c3_skin, c4_texture, c5_forensic, c6_performance):
        fn()
    total = time.perf_counter() - t0

    for label, ok, detail in ROWS:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}]  {label:<58} {detail}")
    n_ok = sum(1 for _, ok, _ in ROWS if ok)
    print("-" * 80)
    verdict = ("tous les critères sont validés — prêt pour la soutenance"
               if n_ok == len(ROWS) else "des critères échouent — corriger avant soutenance")
    print(f"  {n_ok}/{len(ROWS)} vérifications · {total:.1f} s au total — {verdict}")
    sys.exit(0 if n_ok == len(ROWS) else 1)


if __name__ == "__main__":
    main()
