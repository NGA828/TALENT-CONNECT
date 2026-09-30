#!/usr/bin/env bash
# Runs everything needed for a local demo: setup (first run only), API on :4000 and the production web build on :3000.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/dev-setup.sh"

cd "$ROOT/backend"
node dist/main.js &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

cd "$ROOT/frontend"
[ -d .next ] || npm run build
npm run start
