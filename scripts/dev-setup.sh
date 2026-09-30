#!/usr/bin/env bash
# One-shot local setup: installs dependencies, creates backend/.env (with a fresh JWT secret) if missing,
# generates the Prisma client, creates + seeds the SQLite database if missing and builds the API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/backend"
[ -d node_modules ] || npm ci --no-audit --no-fund
if [ ! -f .env ]; then
  cp .env.example .env
  SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${SECRET}/" .env
fi
npx prisma generate >/dev/null
[ -f prisma/dev.db ] || npm run db:reset
[ -f dist/main.js ] || npm run build

cd "$ROOT/frontend"
[ -d node_modules ] || npm ci --no-audit --no-fund
echo "Setup complete. Start the API with: (cd backend && npm run start:prod)  and the website with: (cd frontend && npm run dev)"
