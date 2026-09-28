# Grand Prix CRM

White-label multi-tenant CRM — one deployment serves many businesses, each
with its own branding and isolated data.

## Quick start (local dev)

```bash
cp .env.example .env          # fill in real values
npm install
npm run db:migrate            # or: npm run db:push for a quick prototype DB
npm run prisma:seed:dry       # verify lead parsing (no writes)
npm run prisma:seed           # load businesses + Patchogue Flooring leads
npm run bootstrap:admin       # first boot only: owner user (SEED_ADMIN_*)
npm run dev
```

## Scripts

| Script | What it does |
| ------ | ------------ |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run prisma:seed` | Seed DB (idempotent; businesses + leads, no users) |
| `npm run prisma:seed:dry` | Parse leads only, print counts |
| `npm run bootstrap:admin` | Owner bootstrap (idempotent; consumes `SEED_ADMIN_*`) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | `prisma db push` (no migration files) |
| `npm run db:studio` | Prisma Studio |
| `npm run check:tenant` | Enforce tenant-scoping in server actions |

## Deploy

**Primary: Netlify** — build command `npx prisma migrate deploy && npm run
build`, publish `.next`, Node 24, external Postgres (Neon). See
**[DEPLOY.md](DEPLOY.md)** for the full step-by-step (Netlify → Neon →
DNS → APP_URL → first login).

**Secondary: Docker / VPS**

```bash
docker compose up -d --build
docker compose run --rm app npx prisma migrate deploy   # every deploy
docker compose run --rm app npm run prisma:seed          # fresh DB only
docker compose run --rm app npm run bootstrap:admin      # first boot only
```

See `ARCHITECTURE.md` for auth, tenant, and UI conventions.
