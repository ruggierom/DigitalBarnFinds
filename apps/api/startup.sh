#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
export PYTHONPATH="$(pwd)/src:$APP_DIR/src:${PYTHONPATH:-}"

alembic upgrade head
python -m digital_barn_finds.seed
gunicorn -k uvicorn.workers.UvicornWorker digital_barn_finds.main:app --bind 0.0.0.0:${PORT:-8000}
