"""Tests du domaine — la preuve que l'architecture est saine.

Cette suite ne charge NI FastAPI, NI OpenCV, NI SQLite : si elle passe,
la couche métier est bien autonome (règle des dépendances respectée).

Lancer depuis backend/ :  pytest app/tests -v
"""

import pytest

from app.domain.entities import (
    AnalysisKind,
    DomainError,
    HistogramPayload,
    ImageRef,
    Job,
    JobStatus,
)


# ---------------------------------------------------------------------------
# ImageRef — invariants
# ---------------------------------------------------------------------------

def test_image_ref_megapixels():
    img = ImageRef(id="ab12cd", width=1920, height=1080, channels=3)
    assert img.megapixels == pytest.approx(2.07, abs=0.01)


def test_image_ref_rejette_dimensions_nulles():
    with pytest.raises(DomainError, match="Dimensions invalides"):
        ImageRef(id="x", width=0, height=100, channels=3)


def test_image_ref_rejette_canaux_exotiques():
    with pytest.raises(DomainError, match="canaux"):
        ImageRef(id="x", width=100, height=100, channels=7)


# ---------------------------------------------------------------------------
# HistogramPayload — invariant des 256 bins
# ---------------------------------------------------------------------------

def _valid_hist() -> dict:
    base = [0] * 256
    return dict(
        red=list(base), green=list(base), blue=list(base), luminance=list(base),
        mean=127.4, std=42.1, entropy=7.2,
        dynamic_low=12, dynamic_high=243, clipped_pct=0.8,
    )


def test_histogram_valide():
    payload = HistogramPayload(**_valid_hist())
    assert len(payload.luminance) == 256


def test_histogram_rejette_un_canal_tronque():
    data = _valid_hist()
    data["green"] = [0] * 200
    with pytest.raises(DomainError, match="'green'"):
        HistogramPayload(**data)


# ---------------------------------------------------------------------------
# Job — machine à états
# ---------------------------------------------------------------------------

def _job(kind: AnalysisKind = AnalysisKind.TRANSFER) -> Job:
    return Job(id="j1", kind=kind, image_id="img1", palette_id="img2")


def test_job_parcours_nominal():
    job = _job()
    assert job.status is JobStatus.QUEUED
    assert not job.is_terminal

    job.start()
    assert job.status is JobStatus.RUNNING

    job.complete(result_id="res1", metrics={"w2": {"L": 12.4, "a": 3.1, "b": 5.8}})
    assert job.status is JobStatus.DONE
    assert job.is_terminal
    assert job.result_id == "res1"
    assert job.metrics["w2"]["L"] == 12.4


def test_job_ne_peut_pas_demarrer_deux_fois():
    job = _job()
    job.start()
    with pytest.raises(DomainError, match="illégale"):
        job.start()


def test_job_en_file_ne_peut_pas_etre_complete():
    job = _job()
    with pytest.raises(DomainError, match="illégale"):
        job.complete(result_id="x", metrics={})


def test_job_termine_est_absorbant():
    job = _job()
    job.start()
    job.complete(result_id="r", metrics={})
    with pytest.raises(DomainError):
        job.fail("trop tard")


def test_job_peut_echouer_depuis_la_file():
    job = _job(AnalysisKind.FORENSIC)
    job.fail("image source introuvable")
    assert job.status is JobStatus.ERROR
    assert job.is_terminal
    assert job.error == "image source introuvable"
