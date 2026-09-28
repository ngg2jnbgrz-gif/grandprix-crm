import { PrismaClient } from "@prisma/client";

// PrismaClient singleton — reuse one client across hot reloads in dev,
// one per serverless invocation in production (module cache).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
