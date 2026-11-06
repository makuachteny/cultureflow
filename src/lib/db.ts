import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma client — reused across HMR reloads in dev to avoid connection
 * storms. Reading `env.DATABASE_URL` here means a missing URL fails
 * loudly at first DB import (not with a cryptic Prisma error later).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
