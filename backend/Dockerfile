# HistoVision Pro — API backend (FastAPI + moteurs vision)
#
# Build :  docker build -t histovision-api .        (depuis backend/)
# Run   :  docker run --rm -p 8000:8000 \
#              -v "$PWD/storage:/app/storage" histovision-api

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Dépendances système des wheels de traitement image
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances d'abord : le calque docker reste en cache tant qu'elles
# ne changent pas (pip install n'est rejoué que si requirements.txt bouge).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code applicatif (les 4 couches de la Clean Architecture)
COPY app ./app
COPY scripts ./scripts

# Compte non-root + stockage persistable
RUN mkdir -p /app/storage \
    && useradd --create-home hv \
    && chown -R hv:hv /app
USER hv

EXPOSE 8000

# Sonde de vie sans installer curl
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD python -c "import os, urllib.request, sys; port = os.environ.get('PORT', '8000'); url = f'http://127.0.0.1:{port}/api/health'; sys.exit(0 if urllib.request.urlopen(url, timeout=2).status == 200 else 1)"

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
