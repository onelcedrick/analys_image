
from __future__ import annotations

from pathlib import Path

# Garde-fou : seules ces racines sont accessibles en écriture/lecture.
_ALLOWED_PREFIXES = ("images", "thumbs", "results")


class DiskFileStore:
    """FileStore sur disque local, protégé contre la traversée de chemin."""

    def __init__(self, root: Path, url_prefix: str = "/storage"):
        self._root = Path(root).resolve()
        self._url_prefix = url_prefix

    def save_bytes(self, key: str, data: bytes) -> str:
        """Persiste les octets et retourne l'URL relative de lecture."""
        path = self._safe_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return f"{self._url_prefix}/{key}"

    def read_bytes(self, key: str) -> bytes:
        """Relit un binaire persisté (FileNotFoundError sinon)."""
        return self._safe_path(key).read_bytes()

    def delete(self, key: str) -> None:
        """Suppression idempotente — ne lève jamais pour un absent."""
        self._safe_path(key).unlink(missing_ok=True)

    def _safe_path(self, key: str) -> Path:
        """Résout la clé sous la racine et rejette toute tentative d'évasion.

        Bloque '../', les clés absolues et les préfixes non déclarés :
        un nom de fichier forgé ne peut pas atteindre /etc/passwd.
        """
        parts = key.split("/")
        if not key or key.startswith("/") or ".." in parts:
            raise ValueError(f"Clé de stockage invalide : {key!r}")
        if not key.startswith(_ALLOWED_PREFIXES):
            raise ValueError(f"Clé hors des préfixes autorisés : {key!r}")
        path = (self._root / key).resolve()
        if not str(path).startswith(str(self._root)):
            raise ValueError(f"La clé s'échappe de la racine de stockage : {key!r}")
        return path
