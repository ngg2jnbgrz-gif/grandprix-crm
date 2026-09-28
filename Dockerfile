# ---- base ----
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
# Prisma schema first so the client generates against the exact schema
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
# DOCKER_BUILD=1 enables `output: "standalone"` in next.config.ts
# (Netlify builds run without it and use Netlify's own runtime).
RUN DOCKER_BUILD=1 npm run build

# ---- runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone Next.js server output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Prisma client runtime (generated engines) — needed by lib/db.ts at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# NOTE: database migrations are NOT baked into the image. At deploy time,
# before (re)starting the app, run once against the live database:
#   npx prisma migrate deploy
# Seed afterwards only on a fresh database:
#   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run prisma:seed
CMD ["node", "server.js"]
