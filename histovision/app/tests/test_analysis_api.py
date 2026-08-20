"""Tranche verticale F2 — de la demande de transfert au résultat servi.

Le Job vit sa machine à états complète (queued -> running -> done) dans
l'exécuteur in-process ; le test attend la terminaison par sondage —
exactement comme le fera le front avec le hook useJob (étape 11).

Lancer depuis backend/ :  pytest app/tests -v
"""

import asyncio

import cv2
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.infrastructure.persistence.database import Database
from app.main import create_app


def _png(width: int, height: int, color) -> bytes:
    img = np.full((height, width, 3), color, dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", img)
    assert ok
    return buffer.tobytes()


@pytest.fixture
def app(tmp_path, monkeypatch):
    """Application neuve, stockage temporaire."""
    monkeypatch.setenv("HISTOVISION_STORAGE_DIR", str(tmp_path / "storage"))
    get_settings.cache_clear()
    yield create_app()
    get_settings.cache_clear()


@pytest.fixture
async def client(app):
    """Client HTTP en mémoire — base initialisée comme au vrai boot."""
    database = Database(get_settings().db_path)
    await database.init()
    app.state.database = database
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _upload(client: AsyncClient, raw: bytes, mime: str = "image/png") -> dict:
    res = await client.post("/api/images", files={"file": ("i.png", raw, mime)})
    assert res.status_code == 201
    return res.json()


async def _wait_done(client: AsyncClient, job_id: str, tries: int = 60) -> dict:
    """Sondage — le même pattern que le front (500 ms ici ramenées à 50 ms)."""
    for _ in range(tries):
        body = (await client.get(f"/api/jobs/{job_id}")).json()
        if body["status"] in ("done", "error"):
            return body
        await asyncio.sleep(0.05)
    raise AssertionError("job jamais arrivé à un état terminal")


async def test_transfert_de_bout_en_bout(client):
    cible = await _upload(client, _png(160, 120, (30, 30, 30)))
    source = await _upload(client, _png(160, 120, (210, 210, 210)))

    res = await client.post(
        "/api/transfer",
        json={
            "image_id": cible["id"],
            "palette_id": source["id"],
            "strength": 1.0,
            "skin_protect": False,
        },
    )
    assert res.status_code == 202
    assert res.json()["status"] == "queued"

    job = await _wait_done(client, res.json()["job_id"])
    assert job["status"] == "done", job
    assert job["metrics"]["w2"]["L"] > 50  # fort écart de luminance transporté
    assert len(job["metrics"]["luts"]["L"]) == 256
    assert job["result_url"].startswith("/storage/results/")

    # Le PNG résultat est réellement servi… et lisible par OpenCV.
    png = await client.get(job["result_url"])
    assert png.status_code == 200
    result = cv2.imdecode(np.frombuffer(png.content, np.uint8), cv2.IMREAD_COLOR)
    assert result.mean() > 150  # la cible sombre a bien été éclaircie


async def test_transfert_avec_protection_peau_sans_plantage(client):
    """skin_protect=true active le détecteur YCbCr câblé dans dependencies."""
    cible = await _upload(client, _png(96, 96, (120, 140, 200)))  # teinte chair
    source = await _upload(client, _png(96, 96, (60, 60, 60)))

    res = await client.post(
        "/api/transfer",
        json={"image_id": cible["id"], "palette_id": source["id"], "skin_protect": True},
    )
    job = await _wait_done(client, res.json()["job_id"])
    assert job["status"] == "done", job
    assert "skin_pct" in job["metrics"]


async def test_transfert_image_inconnue_retourne_404(client):
    cible = await _upload(client, _png(64, 64, (30, 30, 30)))
    res = await client.post(
        "/api/transfer", json={"image_id": cible["id"], "palette_id": "fantome"}
    )
    assert res.status_code == 404


async def test_bornes_invalides_retournent_422(client):
    cible = await _upload(client, _png(64, 64, (30, 30, 30)))
    res = await client.post(
        "/api/transfer",
        json={"image_id": cible["id"], "palette_id": cible["id"], "strength": 7.0},
    )
    assert res.status_code == 422


async def test_texture_de_bout_en_bout(client):
    cible = await _upload(client, _png(96, 96, (120, 120, 120)))
    res = await client.post("/api/texture", json={"image_id": cible["id"], "blend": 1.0})
    assert res.status_code == 202
    job = await _wait_done(client, res.json()["job_id"])
    assert job["status"] == "done", job
    assert "otsu_threshold" in job["metrics"]
    assert "textured_pct" in job["metrics"]
    assert len(job["metrics"]["joint_histogram"]) == 32
    assert job["result_url"].startswith("/storage/results/")


def _jpeg_bytes(width: int = 192, height: int = 144, seed: int = 5, quality: int = 85) -> bytes:
    """JPEG bruité — du contenu fréquentiel pour que la DCT ait à dire."""
    rng = np.random.default_rng(seed)
    img = np.clip(rng.normal(128, 45, (height, width, 3)), 0, 255).astype(np.uint8)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    ok, buffer = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    assert ok
    return buffer.tobytes()


async def test_forensic_de_bout_en_bout(client):
    cible = await _upload(client, _jpeg_bytes(), mime="image/jpeg")
    res = await client.post("/api/forensic", json={"image_id": cible["id"]})
    assert res.status_code == 202
    job = await _wait_done(client, res.json()["job_id"])
    assert job["status"] == "done", job
    assert job["metrics"]["blocks_w"] == 192 // 8
    assert job["metrics"]["blocks_h"] == 144 // 8
    assert len(job["metrics"]["coeff_hist"]) == 41
    assert job["result_url"].startswith("/storage/results/")


async def test_job_inconnu_retourne_404(client):
    res = await client.get("/api/jobs/inexistant")
    assert res.status_code == 404
