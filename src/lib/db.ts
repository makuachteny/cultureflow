import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import { createDemoAdapter } from "@/lib/demo-db";

/**
 * Prisma client — reused across HMR reloads in dev to avoid connection
 * storms. Reading `env.DATABASE_URL` here means a missing URL fails
 * loudly at first DB import (not with a cryptic Prisma error later).
 *
 * With DEMO_DB=pglite the client runs on an embedded PGlite database
 * loaded from the seeded snapshot instead (see ./demo-db.ts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const log: ("warn" | "error")[] =
    env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (env.DEMO_DB === "pglite") {
    // PGlite's WASM only boots when a demo adapter is actually created.
    return new PrismaClient({ adapter: createDemoAdapter(), log });
  }

  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Cache in dev (HMR) and always in demo mode, so one warm serverless
// instance keeps a single in-memory database rather than one per import.
if (env.NODE_ENV !== "production" || env.DEMO_DB === "pglite") {
  globalForPrisma.prisma = prisma;
}
