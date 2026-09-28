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

Netlify has no Postgres, so the app connects to an **external Postgres**
(Neon recommended). Netlify auto-detects the Next.js runtime — no plugin
needed. The build command runs `prisma migrate deploy` *before*
`npm run build`, so migrations apply automatically on every deploy.
`next.config.ts` only enables `output: "standalone"` when `DOCKER_BUILD` is
set, so Netlify builds use Netlify's own runtime — leave that as-is.

### 1. Push the repo to Git

Push this repository to GitHub, GitLab, or Bitbucket (private repo is
fine). Netlify will build from there.

### 2. Create the Netlify site

Netlify Dashboard → **Add new site → Import existing project** → connect
the repo, then set:

| Setting        | Value                                          |
| -------------- | ---------------------------------------------- |
| Build command  | `npx prisma migrate deploy && npm run build`   |
| Publish dir    | `.next`                                        |
| Node version   | `24` (already set in `netlify.toml`)           |

(`netlify.toml` in the repo root carries these same settings, so they apply
automatically — you only need to confirm.)

### 3. Provision Neon (Postgres)

1. Go to **neon.tech** → sign up → **New project** (name it e.g.
   `grandprix-crm`, pick a region close to your users).
2. Open the project → **Connection details** → make sure **Pooled
   connection** is selected.
3. Copy the connection string. It looks like:

   `postgresql://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/crm?sslmode=require`

   Keep the `?sslmode=require` suffix — Neon requires TLS. The hostname
   contains `-pooler`, which is what you want on Netlify (serverless
   functions open many short-lived connections).

### 4. Set environment variables in Netlify

Netlify Dashboard → **Site settings → Environment → Environment variables**
→ add:

| Variable            | Value / example                                                                                 | Required |
| ------------------- | ----------------------------------------------------------------------------------------------- | -------- |
| `DATABASE_URL`      | Neon **pooled** connection string with `?sslmode=require`                                       | Yes      |
| `APP_URL`           | The app's public URL. Initially your `https://<site>.netlify.app`; see step 8 after the domain is attached | Yes |
| `BETTER_AUTH_SECRET`| Random secret, min 32 chars: `openssl rand -base64 32`                                          | Yes      |
| `DB_PASSWORD`       | Leave empty/unset — Docker Compose only                                                          | No       |
| `SEED_ADMIN_NAME`   | Only needed for the one-time local bootstrap (step 6). Do not set in Netlify.                   | No       |
| `SEED_ADMIN_EMAIL`  | Same as above                                                                                  | No       |
| `SEED_ADMIN_PASSWORD` | Same as above                                                                                | No       |

Never commit real values to the repo. Scope the vars to Production (and
Deploy Previews if you use them).

### 5. Deploy

Trigger a deploy (**Deploys → Trigger deploy**). The build command first runs
`prisma migrate deploy` against Neon (creating all tables on the first run),
then builds the app. Check the build log for both stages succeeding.

### 6. One-time data: seed + owner bootstrap (run LOCALLY)

Seed and bootstrap need to run against Neon from a machine with the repo
(Node 24). You do **not** do this inside Netlify:

```bash
# 1. In a terminal on your own machine:
cp .env.example .env

# 2. Edit .env:
#    - DATABASE_URL = your Neon POOLED string (with ?sslmode=require)
#    - APP_URL      = your Netlify site URL
#    - BETTER_AUTH_SECRET = a secret (openssl rand -base64 32)
#    - SEED_ADMIN_NAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD =
#      the owner's name, login email, and a TEMPORARY password
#      (forced reset on first login — pick something you will change)
#    - Leave DB_PASSWORD blank (Docker only)

npm install
npm run prisma:seed        # idempotent: businesses + Patchogue Flooring leads
npm run bootstrap:admin    # idempotent: owner User + Member on
                           # "Grand Prix Dynamics" org
```

Both commands are idempotent and safe to re-run; they skip anything that
already exists. **After the bootstrap succeeds, blank the `SEED_ADMIN_*`
values in your local `.env`** and never put them in Netlify or the repo.

### 7. Custom domain (DNS in Canva)

1. In your Canva domain DNS settings, add a **CNAME** record:
   - Host/Name: `app`
   - Target: your Netlify site URL (`<site>.netlify.app`)
   - TTL: default
2. Netlify Dashboard → **Domain settings → Add custom domain** →
   `app.grandprixdynamics.com`.
3. Netlify provisions TLS automatically (may take a few minutes — wait for
   the certificate to show as active before step 8).

### 8. CRITICAL: update APP_URL and redeploy

After the custom domain is attached and TLS is active:

1. Netlify **Site settings → Environment** → set
   `APP_URL=https://app.grandprixdynamics.com` (exact scheme + host).
2. **Deploys → Trigger deploy → Deploy site** (env changes need a redeploy
   to take effect).

**Why this matters:** Better Auth builds login callbacks and cookies from
`APP_URL`. If it still points at the old `.netlify.app` URL, sign-in will
fail with callback errors even though everything else looks fine. See
"Troubleshooting" below.

### 9. Log in

Go to `https://app.grandprixdynamics.com/login`, sign in with the
`SEED_ADMIN_EMAIL` + temporary password from step 6, complete the **forced
password reset**, and you're done. The platform owner lands on the HUD shell;
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
