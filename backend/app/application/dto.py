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
