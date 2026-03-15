#!/usr/bin/env bash
set -euo pipefail

alembic upgrade head
python -m digital_barn_finds.seed
gunicorn -k uvicorn.workers.UvicornWorker digital_barn_finds.main:app --bind 0.0.0.0:${PORT:-8000}

