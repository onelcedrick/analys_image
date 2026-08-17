# HistoVision Pro — backend
# Toutes les cibles se lancent depuis backend/ :  make <cible>

PYTHON ?= python3
VENV   ?= .venv
PIP    := $(VENV)/bin/pip
PY     := $(VENV)/bin/python

.PHONY: install dev test validate streamlit docker-build docker-run clean

install:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

dev:
	$(VENV)/bin/uvicorn app.main:app --reload --port 8000

test:
	$(VENV)/bin/pytest app/tests -q

validate:
	$(PY) scripts/validate.py

streamlit:
	$(VENV)/bin/streamlit run streamlit_app.py

docker-build:
	docker build -t histovision-api .

docker-run:
	docker run --rm -p 8000:8000 -v $(CURDIR)/storage:/app/storage histovision-api

clean:
	find . -type d -name __pycache__ -not -path "./.venv/*" -exec rm -rf {} +
	rm -rf .pytest_cache
