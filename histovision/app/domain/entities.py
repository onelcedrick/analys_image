"""Entités du domaine — objets métier purs.

Cette couche ne dépend de RIEN (ni FastAPI, ni OpenCV, ni SQLite).
Seule concession assumée et documentée : numpy, utilisé uniquement dans
les ports (voir ports.py), car c'est le langage commun des tableaux
d'images entre tous les adaptateurs.

Contenu :
- les objets métier (ImageRef, Job, résultats d'analyse) et leurs INVARIANTES ;
- la machine à états d'un Job (seules les transitions légales sont permises) ;
- l'erreur métier de référence (DomainError).
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum


def new_id() -> str:
    """Identifiant court, lisible dans une URL (12 caractères hex)."""
    return uuid.uuid4().hex[:12]


class DomainError(Exception):
    """Violation d'une règle métier — jamais un bug, toujours un cas prévu."""


# ---------------------------------------------------------------------------
# Énumérations
# ---------------------------------------------------------------------------

class JobStatus(str, Enum):
    """Cycle de vie d'une tâche d'analyse."""

    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


class AnalysisKind(str, Enum):
    """Les trois moteurs du cahier des charges (F2/F3, F4, F5)."""

    TRANSFER = "transfer"
    TEXTURE = "texture"
    FORENSIC = "forensic"


# ---------------------------------------------------------------------------
# Entités
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ImageRef:
    """Une image stockée — métadonnées seulement.

    Les octets (PNG) vivent dans le FileStore ; le Repository ne garde
    que cette fiche d'identité. Invariante : dimensions et canaux valides.
    """

    id: str
    width: int
    height: int
    channels: int
    created_at: float = field(default_factory=time.time)

    def __post_init__(self) -> None:
        if self.width < 1 or self.height < 1:
            raise DomainError(f"Dimensions invalides : {self.width}x{self.height}")
        if self.channels not in (1, 3, 4):
            raise DomainError(f"Nombre de canaux non supporté : {self.channels}")

    @property
    def megapixels(self) -> float:
        """Taille en millions de pixels (affichée dans la télémétrie)."""
        return round(self.width * self.height / 1e6, 2)


@dataclass(frozen=True)
class HistogramPayload:
    """Distribution de probabilité d'une image (F1).

    Quatre histogrammes de 256 niveaux + statistiques globales.
    Invariante : chaque canal compte exactement 256 bins.
    """

    red: list[int]
    green: list[int]
    blue: list[int]
    luminance: list[int]
    mean: float
    std: float
    entropy: float
    dynamic_low: int   # percentile p1  (borne basse de la dynamique utile)
    dynamic_high: int  # percentile p99 (borne haute)
    clipped_pct: float  # % de pixels saturés (<8 ou >247)

    def __post_init__(self) -> None:
        for name, values in (
            ("red", self.red),
            ("green", self.green),
            ("blue", self.blue),
            ("luminance", self.luminance),
        ):
            if len(values) != 256:
                raise DomainError(
                    f"Histogramme '{name}' : 256 niveaux attendus, {len(values)} reçus"
                )


@dataclass(frozen=True)
class TransferResult:
    """Sortie du transport optimal (F2 + F3)."""

    result_id: str
    w2: dict[str, float]            # distance de Wasserstein-2 par canal L*, a*, b*
    luts: dict[str, list[float]]    # courbes de transport, 256 points par canal
    skin_pct: float                 # part de peau protégée par le masque (%)


@dataclass(frozen=True)
class TextureResult:
    """Sortie de l'amélioration locale (F4)."""

    result_id: str
    otsu_threshold: float           # seuil séparant zones lisses / texturées
    textured_pct: float             # % de l'image classée texturée
    joint_histogram: list[list[float]]  # carte conjointe 32x32 (log-normalisée)


@dataclass(frozen=True)
class ForensicResult:
    """Sortie de l'analyse DCT 8x8 (F5)."""

    result_id: str
    blocks_w: int
    blocks_h: int
    flagged_pct: float   # % de blocs suspects (score > 0.65)
    mean_score: float
    coeff_hist: list[int]  # histogramme des coefficients AC du modèle global


# ---------------------------------------------------------------------------
# Machine à états — Job
# ---------------------------------------------------------------------------

# Transitions légales uniquement. DONE et ERROR sont absorbants.
_TRANSITIONS: dict[JobStatus, set[JobStatus]] = {
    JobStatus.QUEUED: {JobStatus.RUNNING, JobStatus.ERROR},
    JobStatus.RUNNING: {JobStatus.DONE, JobStatus.ERROR},
    JobStatus.DONE: set(),
    JobStatus.ERROR: set(),
}


@dataclass
class Job:
    """Une tâche d'analyse asynchrone (transfert, texture ou forensic).

    Toutes les transitions passent par la machine à états : un job terminé
    ne peut plus être relancé, un job en file ne peut pas être complété.
    """

    id: str
    kind: AnalysisKind
    image_id: str
    status: JobStatus = JobStatus.QUEUED
    palette_id: str | None = None
    params: dict = field(default_factory=dict)    # bornes validées par les DTO (application)
    metrics: dict = field(default_factory=dict)   # W2, skin_pct, otsu... écrites à la fin
    result_id: str | None = None                  # id du PNG résultat dans le FileStore
    error: str | None = None
    created_at: float = field(default_factory=time.time)

    # -- transitions ---------------------------------------------------------

    def start(self) -> None:
        """queued -> running."""
        self._transition(JobStatus.RUNNING)

    def complete(self, result_id: str, metrics: dict) -> None:
        """running -> done, avec l'identifiant du résultat et les métriques."""
        self._transition(JobStatus.DONE)
        self.result_id = result_id
        self.metrics = metrics

    def fail(self, error: str) -> None:
        """queued|running -> error, avec un message lisible côté front."""
        self._transition(JobStatus.ERROR)
        self.error = error

    # -- lecture ---------------------------------------------------------------

    @property
    def is_terminal(self) -> bool:
        """True quand plus aucune transition n'est possible."""
        return self.status in (JobStatus.DONE, JobStatus.ERROR)

    # -- interne ---------------------------------------------------------------

    def _transition(self, target: JobStatus) -> None:
        if target not in _TRANSITIONS[self.status]:
            raise DomainError(
                f"Job {self.id} : transition illégale "
                f"{self.status.value} -> {target.value}"
            )
        self.status = target
