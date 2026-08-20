"""Adaptateur de stockage Cloudinary pour les binaires d'images.

Le backend reste compatible avec le port FileStore du domaine.
Cloudinary reçoit les fichiers uploadés et renvoie une URL publique stable.
"""

from __future__ import annotations

import io
import urllib.request
from typing import Optional

import cloudinary
from cloudinary import uploader, utils


class CloudinaryFileStore:
    """Stockage binaire Cloudinary — compatible FileStore du domaine."""

    def __init__(
        self,
        cloud_name: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        folder: str = "histovision",
    ) -> None:
        # Si les credentials ne sont pas passés explicitement, on peut les lire depuis l'environnement
        # via cloudinary.config() qui utilise les variables d'environnement.
        # Ici on les configure explicitement si fournis.
        if cloud_name and api_key and api_secret:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True,
            )
        # Sinon, cloudinary.config() sera déjà configuré via les variables d'environnement.
        # On vérifie qu'on a bien une configuration valide.
        config = cloudinary.config()
        if not config.cloud_name or not config.api_key or not config.api_secret:
            raise ValueError(
                "Cloudinary credentials are required. "
                "Set CLOUDINARY_URL or provide cloud_name, api_key, api_secret."
            )

        self._folder = folder

    def save_bytes(self, key: str, data: bytes) -> str:
        # On transforme la clé en un public_id valide (pas de slash pour éviter les sous-dossiers inattendus)
        public_id = key.replace("/", "_")
        result = uploader.upload(
            io.BytesIO(data),
            folder=self._folder,
            public_id=public_id,
            resource_type="auto",
        )
        # On retourne l'URL sécurisée renvoyée par Cloudinary (elle est complète)
        return str(result.get("secure_url") or result.get("url") or self._resolve_url(public_id))

    def read_bytes(self, key: str) -> bytes:
        public_id = key.replace("/", "_")
        url = self._resolve_url(public_id)
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.read()

    def delete(self, key: str) -> None:
        public_id = key.replace("/", "_")
        uploader.destroy(f"{self._folder}/{public_id}", resource_type="auto")

    def _resolve_url(self, public_id: str) -> str:
        """Construit l'URL publique de l'image à partir du public_id (sans dossier)."""
        # Le public_id complet est dossier/public_id
        full_public_id = f"{self._folder}/{public_id}"
        # On utilise l'utilitaire Cloudinary pour générer l'URL complète (avec /image/upload, etc.)
        url, _ = utils.cloudinary_url(full_public_id, secure=True, format="png")
        return url