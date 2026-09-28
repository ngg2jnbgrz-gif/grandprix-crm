import { PrismaClient } from "@prisma/client";

// PrismaClient singleton — reuse one client across hot reloads in dev,
// one per serverless invocation in production (module cache).

/**
 * Resolve the Postgres connection string.
 *
 * Priority:
 *   1. DATABASE_URL — standard / Docker / VPS / Railway / Render.
 *   2. NETLIFY_DB_URL — injected automatically when Netlify DB is attached
 *      to the site (Site dashboard → Database). No manual copy-paste needed.
 *   3. NETLIFY_DATABASE_URL — legacy Netlify/Neon extension variable.
 */
function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    undefined
  );
}

const databaseUrl = resolveDatabaseUrl();

// PrismaClient singleton — reuse one client across hot reloads in dev,
// one per serverless invocation in production (module cache).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  (databaseUrl
    ? new PrismaClient({ datasourceUrl: databaseUrl })
    : new PrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
