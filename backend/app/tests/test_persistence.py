"""Tests de persistance — les adaptateurs respectent les ports du domaine.

Les tests tournent sur des dossiers temporaires (tmp_path) : aucune base,
aucun fichier ne survit à la suite.

Lancer depuis backend/ :  pytest app/tests -v
"""

import pytest

from app.domain.entities import AnalysisKind, ImageRef, Job
from app.infrastructure.persistence.database import Database
from app.infrastructure.persistence.file_storage import DiskFileStore
from app.infrastructure.persistence.repositories import (
    SqliteImageRepository,
    SqliteJobRepository,
)


async def _fresh_db(tmp_path) -> Database:
    db = Database(tmp_path / "test.sqlite3")
    await db.init()
    return db


# ---------------------------------------------------------------------------
# DiskFileStore
# ---------------------------------------------------------------------------

def test_filestore_aller_retour(tmp_path):
    store = DiskFileStore(tmp_path)
    url = store.save_bytes("images/ab12cd.png", b"\x89PNG-factice")
    assert url == "/storage/images/ab12cd.png"
    assert store.read_bytes("images/ab12cd.png") == b"\x89PNG-factice"


def test_filestore_rejette_les_cles_dangereuses(tmp_path):
    store = DiskFileStore(tmp_path)
    with pytest.raises(ValueError):
        store.save_bytes("../etc/passwd", b"x")
    with pytest.raises(ValueError):
        store.read_bytes("images/../../secret.png")
    with pytest.raises(ValueError):
        store.save_bytes("zone/interdite.png", b"x")


def test_filestore_delete_est_idempotent(tmp_path):
    store = DiskFileStore(tmp_path)
    store.delete("images/inexistant.png")  # doit rester silencieux


# ---------------------------------------------------------------------------
# SqliteImageRepository
# ---------------------------------------------------------------------------

async def test_image_repository_aller_retour(tmp_path):
    repo = SqliteImageRepository(await _fresh_db(tmp_path))
    image = ImageRef(id="img001", width=1280, height=720, channels=3)

    await repo.save(image)

    fetched = await repo.get("img001")
    assert fetched is not None
    assert (fetched.width, fetched.height, fetched.channels) == (1280, 720, 3)
    assert fetched.megapixels == 0.92
    assert await repo.get("inconnu") is None


async def test_image_repository_liste_triee_par_date(tmp_path):
    repo = SqliteImageRepository(await _fresh_db(tmp_path))
    await repo.save(ImageRef(id="ancienne", width=10, height=10, channels=3, created_at=1.0))
    await repo.save(ImageRef(id="recente", width=10, height=10, channels=3, created_at=2.0))

    ids = [img.id for img in await repo.list_all()]
    assert ids == ["recente", "ancienne"]


# ---------------------------------------------------------------------------
# SqliteJobRepository — la machine à états survit à la persistance
# ---------------------------------------------------------------------------

async def test_job_repository_suit_les_transitions(tmp_path):
    db = await _fresh_db(tmp_path)
    images = SqliteImageRepository(db)
    jobs = SqliteJobRepository(db)

    # Les clés étrangères imposent des images existantes.
    await images.save(ImageRef(id="img001", width=640, height=480, channels=3))
    await images.save(ImageRef(id="img002", width=640, height=480, channels=3))

    job = Job(
        id="job01",
        kind=AnalysisKind.TRANSFER,
        image_id="img001",
        palette_id="img002",
        params={"strength": 0.85, "skin_protect": True, "feather": 14},
    )
    await jobs.save(job)
    assert (await jobs.get("job01")).status is job.status  # QUEUED persisté

    job.start()
    await jobs.update(job)
    assert (await jobs.get("job01")).status.value == "running"

    job.complete(result_id="res01", metrics={"w2": {"L": 12.3, "a": 3.1, "b": 5.8}})
    await jobs.update(job)

    fetched = await jobs.get("job01")
    assert fetched.status.value == "done"
    assert fetched.result_id == "res01"
    assert fetched.params["strength"] == 0.85
    assert fetched.metrics["w2"]["L"] == 12.3


async def test_job_repository_rejette_une_image_inexistante(tmp_path):
    """Les clés étrangères bloquent un job orphelin dès l'INSERT."""
    import aiosqlite

    jobs = SqliteJobRepository(await _fresh_db(tmp_path))
    orphan = Job(id="job02", kind=AnalysisKind.TEXTURE, image_id="fantome")
    with pytest.raises(aiosqlite.IntegrityError):
        await jobs.save(orphan)
