FROM node:22-bookworm-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HISTOVISION_STATIC_DIR=/app/static \
    HISTOVISION_STORAGE_DIR=/app/storage \
    HISTOVISION_STORAGE_BACKEND=local \
    HISTOVISION_DATABASE_BACKEND=sqlite \
    PORT=7860
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY --from=frontend /fe/dist ./static
RUN mkdir -p /app/storage/images /app/storage/thumbs /app/storage/results
EXPOSE 7860
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1
