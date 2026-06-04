#!/usr/bin/env bash
# Container entrypoint: apply database migrations, then start the server.
set -euo pipefail

echo "Applying database migrations…"
alembic upgrade head

echo "Starting Shares Manager…"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
