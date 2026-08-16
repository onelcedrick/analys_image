"""Démo F5 — image truquée synthétique, analyse DCT, heatmap téléchargée.

Usage (depuis backend/) :  python scripts/demo_forensic.py
Produit /tmp/hv-forensic-heat.png et /tmp/hv-forensic-overlay.png
"""

import subprocess
import sys
import time
from pathlib import Path

import cv2
import httpx
import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
PORT = 8012
BASE = f"http://127.0.0.1:{PORT}"


def wait_health() -> None:
    for _ in range(40):
        try:
            if httpx.get(f"{BASE}/api/health", timeout=1).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.25)
    raise SystemExit("Le serveur n'a pas démarré — regardez la sortie ci-dessus.")


def jpeg_round(img, quality):
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    assert ok
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def build_tampered():
    """Patch compressé seul (q=50) recollé dans une image q=88."""
    rng = np.random.default_rng(7)
    base = np.clip(rng.normal(128, 45, (320, 480, 3)), 0, 255).astype(np.uint8)
    base = cv2.GaussianBlur(base, (3, 3), 0)
    clean = jpeg_round(base, 88)
    patch = jpeg_round(base[120:220, 180:300], 50)
    out = clean.copy()
    out[120:220, 180:300] = patch
    img = jpeg_round(out, 88)
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    assert ok
    return buf.tobytes(), img


def main() -> None:
    raw, original = build_tampered()
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PORT),
         "--log-level", "warning"],
        cwd=BACKEND,
    )
    try:
        wait_health()
        with httpx.Client(base_url=BASE, timeout=60) as cli:
            image = cli.post(
                "/api/images", files={"file": ("suspect.jpg", raw, "image/jpeg")}
            ).json()
            print(f"image uploadée : {image['id']}")

            job_id = cli.post("/api/forensic", json={"image_id": image["id"]}).json()["job_id"]
            for _ in range(200):
                job = cli.get(f"/api/jobs/{job_id}").json()
                if job["status"] in ("done", "error"):
                    break
                time.sleep(0.2)

            if job["status"] != "done":
                raise SystemExit(f"échec du job : {job.get('error')}")

            m = job["metrics"]
            print(f"statut        : {job['status']}")
            print(f"grille DCT    : {m['blocks_w']}×{m['blocks_h']} blocs")
            print(f"blocs suspects: {m['flagged_pct']} %  (patch truqué en y=120..220, x=180..300)")
            print(f"score moyen   : {m['mean_score']}")

            heat = cli.get(job["result_url"]).content
            Path("/tmp/hv-forensic-heat.png").write_bytes(heat)
            overlay = cv2.addWeighted(
                original, 0.45, cv2.imdecode(np.frombuffer(heat, np.uint8), cv2.IMREAD_COLOR), 0.55, 0
            )
            cv2.imwrite("/tmp/hv-forensic-overlay.png", overlay)
            print("heatmap       : /tmp/hv-forensic-heat.png")
            print("superposition : /tmp/hv-forensic-overlay.png")
    finally:
        server.terminate()
        server.wait()


if __name__ == "__main__":
    main()
