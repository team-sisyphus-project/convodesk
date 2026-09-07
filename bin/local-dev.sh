#!/usr/bin/env bash
# Runs the three dev processes (Rails, Sidekiq, Vite) without overmind/foreman.
set -euo pipefail
cd "$(dirname "$0")/.."
source bin/local-env.sh
bin/local-services.sh

mkdir -p log
trap 'kill 0' EXIT
bundle exec rails s -p 3000 -b 0.0.0.0 2>&1 | sed 's/^/[rails]  /' &
bundle exec sidekiq -C config/sidekiq.yml 2>&1 | sed 's/^/[worker] /' &
bin/vite dev 2>&1 | sed 's/^/[vite]   /' &
wait
