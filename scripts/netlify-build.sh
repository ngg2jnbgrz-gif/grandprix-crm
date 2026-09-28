#!/bin/sh
# Grand Prix CRM — Netlify build script.
#
# Resolves the Postgres connection string, runs pending Prisma migrations,
# then builds Next.js. The database can be:
#   - Netlify DB attached to the site (Site dashboard → Database). Netlify
#     injects NETLIFY_DB_URL automatically — no manual env var needed.
#   - Any external Postgres via the standard DATABASE_URL env var
#     (Neon, Supabase, Railway, Render, self-hosted…).
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  # Netlify DB (current) / legacy Netlify-Neon extension variable.
  DATABASE_URL="${NETLIFY_DB_URL:-${NETLIFY_DATABASE_URL:-}}"
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: no Postgres connection string found." >&2
  echo "Attach a database to this Netlify site (Site dashboard → Database)" >&2
  echo "or set the DATABASE_URL environment variable, then redeploy." >&2
  exit 1
fi

npx prisma migrate deploy
npm run build
