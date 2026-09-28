# Grand Prix CRM — Deployment Guide

> **Primary target: Netlify.** Docker Compose is the secondary option for a
> VPS. Railway/Render notes are included for reference.

## 0. What this is (2-minute brief)

Grand Prix CRM is a **white-label, multi-tenant CRM**: one deployment serves
many businesses. Each business is an Organization ("workspace") with its own
branding (name, logo URL, colors, phone, website) and fully isolated data —
every tenant-facing row carries a `businessId`, and all server actions are
tenant-scoped by `requireOrg()` (never trust a `businessId` from client
input). Platform owners manage client businesses from the Client Accounts
admin; client users only ever see their own workspace.

**Stack:** Next.js 15 (App Router) · TypeScript strict · Tailwind v3 ·
Prisma v6 · PostgreSQL 16 · Better Auth 1.7.x (scrypt password hashing,
7-day sessions, cookie cache). Node 24 at build/runtime.

**White-labeling in one paragraph:** the shell resolves the user's active
organization server-side and injects its `accent` / `primaryColor` /
`logoUrl` as CSS custom properties — per-client branding applies with zero
client JS. Logos are plain URL strings (`Organization.logoUrl`), so there is
no local file storage to manage. Login/reset pages stay deliberately
brand-neutral.

---

## A. Netlify (primary, recommended)

The easiest path needs **no separate database account**: attach **Netlify DB**
(built-in managed Postgres) to the site and Netlify injects the connection
string automatically. The build script (`scripts/netlify-build.sh`) resolves
the database, runs `prisma migrate deploy` *before* `npm run build`, so
migrations apply on every deploy. Only **one** env var is strictly required:
`BETTER_AUTH_SECRET`. `APP_URL` falls back to Netlify's own site URL — set it
explicitly only when you attach a custom domain (step 7).

Prefer an external Postgres (Neon, Supabase, …)? Just set `DATABASE_URL` —
it takes priority over the Netlify DB variables.

### 1. Create the site from GitHub

Click **Deploy to Netlify** (or Netlify Dashboard → Add new site → Import
existing project), connect the repo, and sign in with GitHub. `netlify.toml`
already carries the build settings — just confirm them.

The first build succeeds without a database (migrations are skipped with a
warning) — that's expected. Continue.

### 2. Attach Netlify DB

Netlify Dashboard → your site → **Database** → create/enable a database.
No new account, nothing to copy — Netlify injects `NETLIFY_DB_URL`
automatically at build and runtime.

### 3. Set the one required env var

Netlify Dashboard → **Site settings → Environment → Environment variables**
→ add:

| Variable             | Value                                              | Required |
| -------------------- | -------------------------------------------------- | -------- |
| `BETTER_AUTH_SECRET` | Random secret, min 32 chars: `openssl rand -base64 32` | Yes  |
| `DATABASE_URL`       | Only if using an external Postgres instead of Netlify DB | No |
| `APP_URL`            | Only when a custom domain is attached (step 7)     | No       |
| `DB_PASSWORD`        | Leave empty/unset — Docker Compose only            | No       |

Scope the vars to Production (and Deploy Previews if you use them).

### 4. Deploy

**Deploys → Trigger deploy.** The build resolves the database, applies
Prisma migrations (creating all tables on the first run), then builds the
app. Check the build log for both stages succeeding.

### 5. First boot: open /setup (no terminal needed)

Go to `https://<your-site>.netlify.app/setup` on your phone or computer:

1. Enter your name, email, and a password (min 12 characters) → creates
   your **owner** account on the Grand Prix Dynamics workspace.
2. Optionally upload the partner-lead spreadsheet (`.xlsx`) → imports every
   contact into Patchogue Flooring; hot-list rows automatically become
   priority opportunities.

**This screen permanently disappears after setup** — it refuses to run once
any user exists. (Advanced alternative: the CLI seed + bootstrap in
`prisma/seed.ts` / `prisma/bootstrap-admin.ts` still work for scripted
deploys — see git history / ARCHITECTURE.md.)

### 6. Custom domain (DNS in Canva)

1. In your Canva domain DNS settings, add a **CNAME** record:
   - Host/Name: `app`
   - Target: your Netlify site URL (`<site>.netlify.app`)
   - TTL: default
2. Netlify Dashboard → **Domain settings → Add custom domain** →
   `app.grandprixdynamics.com`.
3. Netlify provisions TLS automatically (may take a few minutes — wait for
   the certificate to show as active before step 7).

### 7. Point APP_URL at the custom domain and redeploy

After the custom domain is attached and TLS is active:

1. Netlify **Site settings → Environment** → set
   `APP_URL=https://app.grandprixdynamics.com` (exact scheme + host).
2. **Deploys → Trigger deploy → Deploy site** (env changes need a redeploy
   to take effect).

**Why this matters:** Better Auth builds login callbacks and cookies from
`APP_URL`. If it still points at the old `.netlify.app` URL, sign-in will
fail with callback errors even though everything else looks fine. See
"Troubleshooting" below.

### 8. Log in

Go to `https://app.grandprixdynamics.com/login`, sign in with the email +
password you chose in step 5. The platform owner lands on the HUD shell;
Client Accounts manages the businesses.

---
## B. Docker / VPS (secondary)

Same app, self-hosted Postgres in the same stack. `next.config.ts` emits
`output: "standalone"` only when `DOCKER_BUILD=1` (set in the Dockerfile
build stage) — Netlify builds are unaffected.

```bash
# 1. On the VPS, in the repo directory:
cp .env.example .env
#    Edit .env: DATABASE_URL is derived from DB_PASSWORD inside compose,
#    so set DB_PASSWORD=<strong password>, APP_URL=https://<your host>,
#    BETTER_AUTH_SECRET=$(openssl rand -base64 32),
#    and SEED_ADMIN_* for the first boot only.

# 2. Build + start:
docker compose up -d --build

# 3. Apply migrations (every deploy, before/with traffic switch):
docker compose exec app npx prisma migrate deploy

# 4. Fresh database only — seed + owner bootstrap:
docker compose exec app npm run prisma:seed
docker compose exec app npm run bootstrap:admin
```

Container images never bake in migrations; step 3 runs them at deploy time.
After the bootstrap succeeds, unset `SEED_ADMIN_*` in `.env` (and
`docker compose up -d` again to pick up the change). Postgres data persists
in the `pgdata` volume.

### Backup & restore

Nightly `pg_dump` via cron on the host:

```bash
# /etc/cron.d/gpd-crm-backup  (runs 02:30 daily)
30 2 * * * root docker compose -f /path/to/grandprix-crm/docker-compose.yml \
  exec -T db pg_dump -U crm crm | gzip > /var/backups/gpd-crm/crm-$(date +\%F).sql.gz
```

Keep 14 days (`find /var/backups/gpd-crm -mtime +14 -delete`). Restore:

```bash
gunzip -c /var/backups/gpd-crm/crm-YYYY-MM-DD.sql.gz | \
  docker compose exec -T db psql -U crm -d crm
```

On Netlify, use Neon's built-in backups / point-in-time restore instead of
`pg_dump`.

---

## C. Railway / Render (notes)

Both work the same way as Netlify's external-DB model:

- **Database:** create a Postgres addon *or* reuse the Neon database from
  section A (Neon works fine with both).
- **Env vars:** set the same table from section A-4 (`DATABASE_URL`,
  `APP_URL`, `BETTER_AUTH_SECRET`). Leave `DB_PASSWORD` unset.
- **Deploy command:** run `prisma migrate deploy` before the build —
  Railway: add to the build command (`npx prisma migrate deploy && npm run
  build`); Render: put it in the **Build Command** field the same way.
- **Seed/bootstrap:** same as section A-6 — run locally with `DATABASE_URL`
  pointed at the live database, once.

---

## Env var reference

| Variable               | Required | Used by                      | Notes |
| ---------------------- | -------- | ---------------------------- | ----- |
| `DATABASE_URL`         | Yes      | Prisma (app, migrate, seed)   | Neon pooled string + `?sslmode=require` on Netlify; derived from `DB_PASSWORD` in Compose |
| `APP_URL`              | Yes      | Better Auth (callbacks/cookies), absolute links | Must match deployed URL exactly; update + redeploy after domain attach |
| `BETTER_AUTH_SECRET`   | Yes      | Better Auth (session/cookie signing) | `openssl rand -base64 32`; unique per environment |
| `DB_PASSWORD`          | Docker only | Compose `db` service      | Leave unset on Netlify/Railway/Render |
| `SEED_ADMIN_NAME`      | First boot | `npm run bootstrap:admin` | Bootstrap only; never commit real values; unset after use |
| `SEED_ADMIN_EMAIL`     | First boot | `npm run bootstrap:admin` | Same as above |
| `SEED_ADMIN_PASSWORD`  | First boot | `npm run bootstrap:admin` | Temporary — forced reset at first login; same as above |

## First-boot checklist

- [ ] Repo pushed; Netlify site created (build cmd + Node 24 confirmed)
- [ ] Neon project created; pooled `DATABASE_URL` copied
- [ ] `DATABASE_URL`, `APP_URL`, `BETTER_AUTH_SECRET` set in Netlify env
- [ ] Deploy succeeds (migration log shows tables created)
- [ ] `npm run prisma:seed` + `npm run bootstrap:admin` run locally against Neon
- [ ] Canva DNS: CNAME `app` → Netlify site; domain added in Netlify; TLS active
- [ ] `APP_URL=https://app.grandprixdynamics.com` set in Netlify; redeployed
- [ ] Login with SEED_ADMIN credentials → forced password reset → shell loads
- [ ] `SEED_ADMIN_*` blanked everywhere; `.env` never committed (`.gitignore`d)

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Login redirects / callback errors after domain attach | `APP_URL` still points at old URL | Set `APP_URL=https://app.grandprixdynamics.com` in Netlify env **and redeploy** (step A-8) |
| `BETTER_AUTH_SECRET` / auth errors at boot | Missing or < 32 chars | Generate with `openssl rand -base64 32`, set, redeploy |
| Build fails at `prisma migrate deploy` | Wrong `DATABASE_URL`, non-pooled Neon string, or missing `?sslmode=require` | Use the pooled connection string exactly as Neon shows it |
| Too many DB connections on Netlify | Non-pooled connection string | Switch to the `-pooler` host from Neon's connection details |
| `prisma generate` / client errors in build | Missing postinstall | `package.json` has `"postinstall": "prisma generate"` — verify it's committed |
| `npx prisma migrate deploy` says nothing to do but tables missing | Pointed at the wrong database/branch | Confirm `DATABASE_URL` matches the Neon project you seeded |
| Docker: app starts before DB | Compose handles this via `depends_on` healthcheck; manual `docker run` does not | Always start via `docker compose up`, and run migrate before traffic |

## Uploads / logo storage (today and later)

Today, business logos are **URL strings** (`Organization.logoUrl`, edited in
Client Accounts → theme editor). No local disk writes exist anywhere in the
app, which is exactly what Netlify's ephemeral filesystem needs — nothing
to configure.

If you later want real file uploads: point `logoUrl` at **Netlify Blobs**
(`@netlify/blobs`) or an **S3-compatible bucket** — `logoUrl` already
accepts any URL, so no schema change is needed. Add an upload API route that
writes to the blob store and returns the URL, then saves it via the existing
`updateOrganization` action.

---

*Stack: Next.js 15 · TypeScript strict · Tailwind v3 · Prisma v6 ·
PostgreSQL 16 · Better Auth 1.7.x · Node 24. See `ARCHITECTURE.md` for
auth/tenant conventions and `README.md` for local development.*
