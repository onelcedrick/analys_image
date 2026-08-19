"""Adaptateur de stockage Cloudinary pour les binaires d'images.

Le backend reste compatible avec le port FileStore du domaine.
Cloudinary reçoit les fichiers uploadés et renvoie une URL publique stable.
"""

from __future__ import annotations

import io
import urllib.request
from pathlib import Path

import cloudinary
from cloudinary import uploader


class CloudinaryFileStore:
    """Stockage binaire Cloudinary — compatible FileStore du domaine."""

    def __init__(self, cloud_name: str, api_key: str, api_secret: str, folder: str = "histovision") -> None:
        if not cloud_name or not api_key or not api_secret:
            raise ValueError("Cloudinary credentials are required")

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )
        self._folder = folder

    def save_bytes(self, key: str, data: bytes) -> str:
        public_id = key.replace("/", "_")
        result = uploader.upload(
            io.BytesIO(data),
            folder=self._folder,
            public_id=public_id,
            resource_type="auto",
        )
        return str(result.get("secure_url") or result.get("url") or f"https://res.cloudinary.com/{cloudinary.config().cloud_name}/{public_id}")

    def read_bytes(self, key: str) -> bytes:
        public_id = key.replace("/", "_")
        url = self._resolve_url(public_id)
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.read()

    def delete(self, key: str) -> None:
        public_id = key.replace("/", "_")
        uploader.destroy(f"{self._folder}/{public_id}", resource_type="auto")

    def _resolve_url(self, public_id: str) -> str:
        return f"https://res.cloudinary.com/{cloudinary.config().cloud_name}/{self._folder}/{public_id}"
