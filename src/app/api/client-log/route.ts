/**
 * POST /api/client-log
 *
 * Best-effort sink for unhandled client-side errors. Called via
 * navigator.sendBeacon() from src/app/error.tsx (and global-error.tsx).
 *
 * Why this exists: when a UI error boundary fires in production, the
 * stack lives only in the user's browser console. This endpoint pushes
 * a sanitised summary into the structured server log so platform-level
 * log shippers (Datadog, Loki, CloudWatch) capture it.
 *
 * Hard limits:
 *   - 4 KB body cap — sendBeacon is metered.
 *   - 1 hit per IP per second — drops floods from a tight loop.
 *   - Never echoes the body back. Returns 204 always so this isn't
 *     useful as a probe oracle.
 */

import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { guard } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4096;

export async function POST(req: Request) {
  // Loose ceiling — a single user with a misbehaving page could
  // sendBeacon dozens of times. 60/min keeps that bounded.
  const limited = guard(req, "client-log", 60, 60_000);
  if (limited) return new NextResponse(null, { status: 204 });

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (bodyText.length > MAX_BYTES) {
    bodyText = bodyText.slice(0, MAX_BYTES);
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    // Not JSON — log the raw truncated text.
    parsed = { raw: bodyText };
  }

  // Strip anything that smells like a token before logging.
  for (const k of Object.keys(parsed)) {
    if (/token|secret|password|key/i.test(k)) parsed[k] = "[redacted]";
  }

  log.warn("client-error", parsed);
  return new NextResponse(null, { status: 204 });
}
