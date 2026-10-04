#!/usr/bin/env bash
# One command for local development, from the project root:
#   npm run dev:local     (or: ./scripts/dev.sh)
# Installs packages if needed, makes sure Docker is up, starts local Supabase
# (applying supabase/migrations), writes its keys to .env.development.local,
# then runs the Next.js dev server.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1;33m🍕 %s\033[0m\n" "$1"; }

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is needed for local Supabase. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  say "Starting Docker…"
  (open -a Docker 2>/dev/null || true)
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
  docker info >/dev/null 2>&1 || { echo "Docker isn't running yet. Start Docker Desktop, then run this again."; exit 1; }
fi

if [ ! -d node_modules ]; then
  say "Installing packages…"
  npm install
fi

if npx supabase status >/dev/null 2>&1; then
  say "Local Supabase is already running."
else
  say "Starting local Supabase (the first run downloads Docker images and takes a few minutes)…"
  npx supabase start
fi

node scripts/sync-local-env.mjs

say "Ready:
   App               http://localhost:3000
   Supabase Studio   http://localhost:44323
   Local emails      http://localhost:44324   (sign-in codes land here)
   Stop the database later with: npm run db:stop"
exec npm run dev
