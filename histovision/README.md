# HistoVision Pro — Docker & Hugging Face

## Fonctionnalités déploiement

- API FastAPI + UI React (un seul container)
- **Keep-alive** `GET /api/ping` toutes les **2 minutes** (front)
- Résultats PNG via `GET /api/jobs/{id}/result`
- Port **7860** (Hugging Face Spaces)

## Local

```bash
docker compose up --build
```

→ http://localhost:7860

## Hugging Face Spaces

1. Space type **Docker**
2. Déposer ce dossier (Dockerfile à la racine)
3. Optionnel — Secrets :
   - `HISTOVISION_STORAGE_BACKEND=cloudinary`
   - `HISTOVISION_CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET`
   - `HISTOVISION_DATABASE_URL` (Postgres/Neon)

## Endpoints keep-alive

| Méthode | URL | Rôle |
|---------|-----|------|
| GET | `/api/health` | Santé + compteur pings |
| GET | `/api/ping` | `{ "pong": true }` |
| HEAD | `/api/ping` | 204 |

Le front envoie un ping 5 s après le chargement, puis **toutes les 2 min**.
