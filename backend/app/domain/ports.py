"""Ports du domaine — les contrats que l'infrastructure s'engage à respecter.

Règle des dépendances : ces interfaces APPARTIENNENT au domaine ; ce sont
les adaptateurs concrets (SQLite, disque, OpenCV, POT...) qui s'y conforment,
jamais l'inverse. Conséquence directe : la couche application est testable
avec des bouchons (mocks) sans installer la moindre bibliothèque de vision.

On ne déclare un port QUE pour :
- un accès à un état mutable   -> pattern REPOSITORY (images, jobs) ;
- un comportement remplaçable  -> pattern STRATEGY (moteurs d'analyse).

Les fonctions pures (ex. le calcul d'histogramme) n'ont pas besoin de port :
l'application les appelle directement, elles n'ont ni état ni variante.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np

from app.domain.entities import (
    AnalysisKind,
    ImageRef,
    Job,
)

# Un tableau image tel qu'il circule entre adaptateurs :
# H x W x 3, BGR, uint8 — le format natif d'OpenCV.
ImageArray = np.ndarray


# ---------------------------------------------------------------------------
# Ports d'état (pattern Repository + stockage binaire)
# ---------------------------------------------------------------------------

@runtime_checkable
class FileStore(Protocol):
    """Stockage des binaires : originaux, vignettes, PNG résultats.

    Le domaine manipule des CLES (ex. 'images/ab12cd.png') et des URL
    relatives ('/storage/images/ab12cd.png'), jamais des chemins absolus :
    disque local aujourd'hui, S3 demain, zéro changement dans l'application.
    """

    def save_bytes(self, key: str, data: bytes) -> str:
        """Persiste les octets et retourne l'URL relative de lecture."""
        ...

    def read_bytes(self, key: str) -> bytes:
        """Relit un binaire persisté. Lève FileNotFoundError sinon."""
        ...

    def delete(self, key: str) -> None:
        """Supprime silencieusement (idempotent)."""
        ...


@runtime_checkable
class ImageRepository(Protocol):
    """Registre des images uploadées (pattern Repository)."""

    async def save(self, image: ImageRef) -> None: ...

    async def get(self, image_id: str) -> ImageRef | None: ...

    async def list_all(self) -> list[ImageRef]: ...


@runtime_checkable
class JobRepository(Protocol):
    """Suivi des tâches d'analyse (pattern Repository)."""

    async def save(self, job: Job) -> None: ...

    async def get(self, job_id: str) -> Job | None: ...

    async def update(self, job: Job) -> None: ...


# ---------------------------------------------------------------------------
# Ports de comportement
# ---------------------------------------------------------------------------

@runtime_checkable
class ImageLoader(Protocol):
    """Charge une ImageRef en tableau numpy.

    L'application ne touche jamais à cv2.imdecode : c'est cet adaptateur
    qui fait octets -> tableau. Isolable en test avec un tableau factice.
    """

    def load(self, image: ImageRef) -> ImageArray: ...


@runtime_checkable
class AnalysisStrategy(Protocol):
    """Un moteur d'analyse = une stratégie (pattern Strategy).

    Contrat unique pour les trois moteurs du cahier des charges :
    l'application ne sait pas si elle exécute du POT, du CLAHE ou de la DCT —
    elle transmet des tableaux, récupère un PNG encodé et des métriques.
    """

    kind: AnalysisKind

    def run(
        self,
        image: ImageArray,
        params: dict,
        palette: ImageArray | None = None,
    ) -> tuple[bytes, dict]:
        """Exécute l'analyse.

        :param image:   tableau BGR uint8 de l'image cible
        :param params:  curseurs utilisateur (bornes déjà validées par les DTO)
        :param palette: tableau BGR uint8 de la source (transfert uniquement)
        :return:        (octets PNG du résultat, métriques du domaine)
        """
        ...
