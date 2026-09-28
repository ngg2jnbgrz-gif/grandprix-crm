#!/bin/sh
# Grand Prix CRM — Netlify build script.
#
# Resolves the Postgres connection string, runs pending Prisma migrations
# when a database is reachable, then builds Next.js. The database can be:
#   - Netlify DB attached to the site (Site dashboard → Database). Netlify
#     injects NETLIFY_DB_URL automatically — no manual env var needed.
#   - Any external Postgres via the standard DATABASE_URL env var
#     (Neon, Supabase, Railway, Render, self-hosted…).
#
# IMPORTANT: this script never fails the build just because no database is
# attached yet. The one-click "Deploy to Netlify" flow builds the site
# BEFORE you get a chance to attach a database — failing here would make
# that first deploy look broken. Instead we warn loudly, skip migrations,
# and build anyway. The /setup page detects an unmigrated database at
# runtime and tells you exactly what to do (attach DB → Trigger deploy).
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  # Netlify DB (current) / legacy Netlify-Neon extension variable.
  DATABASE_URL="${NETLIFY_DB_URL:-${NETLIFY_DATABASE_URL:-}}"
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "==================================================================" >&2
  echo "WARNING: no Postgres connection string found — skipping migrations." >&2
  echo "Attach a database to this Netlify site (Site dashboard → Database)" >&2
  echo "or set the DATABASE_URL environment variable, then trigger a" >&2
  echo "redeploy (Deploys → Trigger deploy) so migrations can run." >&2
  echo "==================================================================" >&2
else
  echo "Running Prisma migrations…"
  npx prisma migrate deploy
fi

npm run build
