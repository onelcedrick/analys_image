# HistoVision Pro — Backend

API FastAPI pour l'analyse histogrammique d'images.

## Fonctionnalités

- **F1** : Upload et gestion d'images (normalisation ≤ 1080px)
- **F2** : Transfert de palette par transport optimal (POT, espace CIE Lab)
- **F3** : Protection des zones de peau (MediaPipe)
- **F4** : Amélioration texture (CLAHE + filtre bilatéral, histogramme conjoint)
- **F5** : Analyse forensique DCT 8×8 (détection copier-coller, double compression)

## Installation

```bash
pip install -r requirements.txt
```

## Démarrage

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API est accessible sur `http://localhost:8000`
- Swagger UI : `http://localhost:8000/docs`
- ReDoc : `http://localhost:8000/redoc`

## Configuration

Copiez `.env.example` vers `.env` et ajustez les variables :

```bash
HISTOVISION_STORAGE_DIR=./storage
HISTOVISION_MAX_SIDE=1080
HISTOVISION_MAX_UPLOAD_MB=20
HISTOVISION_CORS_ORIGINS=["http://localhost:5173"]
```

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Santé de l'API |
| POST | `/api/images` | Upload d'image |
| GET | `/api/images` | Liste des images |
| GET | `/api/images/{id}` | Métadonnées |
| GET | `/api/images/{id}/histogram` | Histogrammes RVB |
| POST | `/api/transfer` | Transfert de palette |
| POST | `/api/texture` | Amélioration texture |
| POST | `/api/forensic` | Analyse forensique |
| GET | `/api/jobs/{id}` | État d'un job |

## Architecture

Clean Architecture :
- **domain** : entités métier, ports (interfaces)
- **application** : cas d'usage, DTOs
- **infrastructure** : implémentations (OpenCV, POT, SQLite)
- **api** : routes HTTP FastAPI

## Tests

```bash
pytest
```
