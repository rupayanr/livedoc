#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  --ws-ping-interval 20 \
  --ws-ping-timeout 20 \
  "$@"
