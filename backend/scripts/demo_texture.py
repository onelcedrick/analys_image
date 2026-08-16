"""Démo F4 — démarre un serveur éphémère, joue un job texture, télécharge.

Usage (depuis backend/) :  python scripts/demo_texture.py
Aucune variable shell, aucun copier-coller d'id : tout est en Python.
"""

import subprocess
import sys
import time
from pathlib import Path

import cv2
import httpx
import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
PORT = 8011  # volontairement != 8000 (évite un éventuel serveur zombie)
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


def build_image() -> bytes:
    img = np.full((480, 640, 3), 200, np.uint8)          # gauche : lisse
    rng = np.random.default_rng(0)
    zone = np.clip(rng.normal(110, 45, (480, 320, 3)), 0, 255).astype(np.uint8)
    img[:, 320:] = cv2.GaussianBlur(zone, (3, 3), 0)     # droite : texturée
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


def main() -> None:
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PORT),
         "--log-level", "warning"],
        cwd=BACKEND,
    )
    try:
        wait_health()
        with httpx.Client(base_url=BASE, timeout=30) as cli:
            image = cli.post(
                "/api/images",
                files={"file": ("demo.png", build_image(), "image/png")},
            ).json()
            print(f"image uploadée : {image['id']}  ({image['width']}x{image['height']})")

            job_id = cli.post(
                "/api/texture",
                json={"image_id": image["id"], "clip": 3.0, "smooth": 30, "blend": 0.9},
            ).json()["job_id"]

            for _ in range(100):
                job = cli.get(f"/api/jobs/{job_id}").json()
                if job["status"] in ("done", "error"):
                    break
                time.sleep(0.2)

            if job["status"] != "done":
                raise SystemExit(f"échec du job : {job.get('error')}")

            m = job["metrics"]
            print(f"statut         : {job['status']}")
            print(f"seuil Otsu     : {m['otsu_threshold']}")
            print(f"zone texturée  : {m['textured_pct']} %  (attendu ~50 %)")

            png = cli.get(job["result_url"]).content
            Path("/tmp/hv-texture-result.png").write_bytes(png)
            print("résultat       : /tmp/hv-texture-result.png")
    finally:
        server.terminate()
        server.wait()


if __name__ == "__main__":
    main()
