"""Tranche verticale F1 — du fichier reçu jusqu'à l'histogramme servi.

L'application FastAPI réelle tourne en mémoire (transport ASGI httpx),
avec un stockage temporaire : aucun fichier ni base ne survit aux tests.

Lancer depuis backend/ :  pytest app/tests -v
"""

import cv2
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.infrastructure.persistence.database import Database
from app.main import create_app


def _png_bytes(width: int = 320, height: int = 240) -> bytes:
    """Image de synthèse : fond sombre, disque orangé, rectangle bleu."""
    img = np.full((height, width, 3), 28, dtype=np.uint8)
    cv2.circle(img, (width // 2, height // 2), min(width, height) // 3, (60, 160, 230), -1)
    cv2.rectangle(img, (20, 20), (width // 3, height // 3), (200, 190, 60), -1)
    ok, buffer = cv2.imencode(".png", img)
    assert ok
    return buffer.tobytes()


@pytest.fixture
def app(tmp_path, monkeypatch):
    """Une application neuve, stockant dans un dossier temporaire."""
    monkeypatch.setenv("HISTOVISION_STORAGE_DIR", str(tmp_path / "storage"))
    get_settings.cache_clear()
    yield create_app()
    get_settings.cache_clear()


@pytest.fixture
async def client(app):
    """Client HTTP en mémoire — la base est initialisée comme au vrai boot."""
    database = Database(get_settings().db_path)
    await database.init()
    app.state.database = database
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _upload(client, raw: bytes, mime: str = "image/png"):
    return await client.post("/api/images", files={"file": ("test.png", raw, mime)})


async def test_upload_retourne_201_et_une_carte_d_identite(client):
    res = await _upload(client, _png_bytes(320, 240))
    assert res.status_code == 201
    body = res.json()
    assert body["width"] == 320 and body["height"] == 240
    assert body["channels"] == 3
    assert body["thumb_url"].startswith("/storage/thumbs/")
    assert body["image_url"].endswith(".png")
    assert body["megapixels"] == 0.08


async def test_upload_redimensionne_les_grandes_images(client):
    """Une 2400x1600 doit revenir à 1080x720 (ratio conservé, §3.3)."""
    res = await _upload(client, _png_bytes(2400, 1600))
    assert res.status_code == 201
    assert res.json()["width"] == 1080
    assert res.json()["height"] == 720


async def test_upload_rejette_un_mauvais_format(client):
    res = await _upload(client, b"du texte", mime="text/plain")
    assert res.status_code == 415


async def test_upload_rejette_un_contenu_illisible(client):
    res = await _upload(client, b"pas une image", mime="image/png")
    assert res.status_code == 422


async def test_liste_et_carte_d_identite(client):
    created = (await _upload(client, _png_bytes())).json()

    listed = (await client.get("/api/images")).json()["images"]
    assert [img["id"] for img in listed] == [created["id"]]

    fetched = await client.get(f"/api/images/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["width"] == created["width"]


async def test_image_inconnue_retourne_404(client):
    res = await client.get("/api/images/inexistant")
    assert res.status_code == 404


async def test_histogram_sert_256_bins_par_canal(client):
    created = (await _upload(client, _png_bytes())).json()

    res = await client.get(f"/api/images/{created['id']}/histogram")
    assert res.status_code == 200
    body = res.json()

    for channel in ("red", "green", "blue", "luminance"):
        bins = body[channel]
        assert len(bins) == 256
        assert sum(bins) == 320 * 240  # tous les pixels sont comptés

    assert 0 <= body["mean"] <= 255
    assert body["entropy"] > 0
    assert body["dynamic_low"] <= body["dynamic_high"]
    assert 0 <= body["clipped_pct"] <= 100
