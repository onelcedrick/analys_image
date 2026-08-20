"""DTO (Data Transfer Objects) — le contrat HTTP en Pydantic v2.

Règle de frontière : ce sont les SEULS objets qui traversent l'API.
Les entités du domaine (dataclasses pures) ne sont jamais sérialisées
directement vers le front : un changement de schéma interne ne casse
donc jamais le contrat publié — et inversement.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ImageMeta(BaseModel):
    """Carte d'identité d'une image uploadée (réponse F1)."""

    id: str
    width: int
    height: int
    channels: int
    megapixels: float
    thumb_url: str = Field(description="Vignette 256 px servie par /storage")
    image_url: str = Field(description="PNG original normalisé (<= 1080 px)")
    created_at: float


class ImageListOut(BaseModel):
    """Banque d'images du front, triée de la plus récente à la plus ancienne."""

    images: list[ImageMeta]


class HistogramOut(BaseModel):
    """Distributions de probabilité d'une image — 256 niveaux par canal."""

    red: list[int] = Field(description="Canal rouge, 256 bins")
    green: list[int] = Field(description="Canal vert, 256 bins")
    blue: list[int] = Field(description="Canal bleu, 256 bins")
    luminance: list[int] = Field(description="Luminance Rec.601, 256 bins")
    mean: float = Field(description="Luma moyenne")
    std: float = Field(description="Écart-type luma")
    entropy: float = Field(description="Entropie en bits/pixel")
    dynamic_low: int = Field(description="Percentile p1 de la dynamique utile")
    dynamic_high: int = Field(description="Percentile p99 de la dynamique utile")
    clipped_pct: float = Field(description="% de pixels saturés (<8 ou >247)")


# ---------------------------------------------------------------------------
# Requêtes d'analyse — bornes validées côté serveur (source de vérité)
# ---------------------------------------------------------------------------

class TransferRequest(BaseModel):
    """Paramètres du transfert chromatique (F2 + F3)."""

    image_id: str = Field(min_length=1, description="Cible à recolorer")
    palette_id: str = Field(min_length=1, description="Source de la palette")
    strength: float = Field(0.85, ge=0.0, le=1.0, description="Intensité du transport")
    skin_protect: bool = Field(True, description="Épargner les zones de peau")
    feather: int = Field(14, ge=2, le=30, description="Flou de bordure du masque (px)")


class TextureRequest(BaseModel):
    """Paramètres de l'amélioration locale (F4) — moteur à l'étape 7."""

    image_id: str = Field(min_length=1)
    clip: float = Field(2.6, ge=0.5, le=6.0, description="Clip limit du CLAHE")
    smooth: int = Field(26, ge=8, le=60, description="Sigma couleur du bilatéral")
    blend: float = Field(0.85, ge=0.0, le=1.0, description="Intensité globale")


class ForensicRequest(BaseModel):
    """Paramètres de l'analyse DCT (F5) — moteur à l'étape 8."""

    image_id: str = Field(min_length=1)


# ---------------------------------------------------------------------------
# Réponses asynchrones
# ---------------------------------------------------------------------------

class JobRefOut(BaseModel):
    """Accusé de réception d'une tâche acceptée (HTTP 202)."""

    job_id: str
    status: str


class JobOut(BaseModel):
    """État complet d'une tâche — sondé par le front toutes les 500 ms."""

    id: str
    kind: str
    status: str
    image_id: str
    palette_id: str | None = None
    metrics: dict = Field(default_factory=dict, description="W2, LUT, skin_pct, otsu…")
    result_url: str | None = Field(None, description="PNG servi par /storage")
    error: str | None = None
    created_at: float
