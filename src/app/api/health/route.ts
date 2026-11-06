/**
 * GET /api/health
 *
 * Lightweight healthcheck for load balancers / container orchestrators.
 * Returns 200 with { status: "ok" } when the DB is reachable, 503 otherwise.
 *
 * Intentionally minimal: no auth, no detailed diagnostics, no logging of
 * probe requests (otherwise platform health probes spam your logs).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Cheapest possible query — forces the connection pool to open and
    // verifies auth + migrations have been applied.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "cultureflow" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
