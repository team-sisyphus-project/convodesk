#!/usr/bin/env bash
# Starts (or reports) Postgres and Redis for local development.
set -euo pipefail
cd "$(dirname "$0")/.."
source bin/local-env.sh

if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "postgres: already running"
else
  pg_ctl -D "$PGDATA" -l "$HOME/.local/var/pgsql17.log" -o "-p 5432 -k /tmp" start
fi

if redis-cli ping >/dev/null 2>&1; then
  echo "redis: already running"
else
  redis-server --port 6379 --daemonize yes --dir "$HOME/.local/var" --logfile "$HOME/.local/var/redis.log"
  echo "redis: started"
fi
