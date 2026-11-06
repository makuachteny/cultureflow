/**
 * Periodic sweep of expired reservations.
 *
 * Hit this every minute (Vercel Cron, Render Cron, GitHub Actions
 * schedule, etc.) to release seats whose holders abandoned the cart.
 *
 * The hot-path code (`reserveSeats`) already sweeps before each
 * reservation, so this endpoint is belt-and-braces for catching rows
 * that nothing else has reason to touch — e.g. all-paid events on a
 * quiet day where no one new is reserving.
 *
 * Authentication: requires `Authorization: Bearer ${CRON_SECRET}` to
 * keep random callers from triggering it. Set `CRON_SECRET` in env.
 */

import { NextResponse } from "next/server";
import { sweepExpiredReservations } from "@/lib/reservations";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const released = await sweepExpiredReservations();
  return NextResponse.json({ ok: true, released });
}

// Allow GET for ease of pinging from a cron service that only sends GETs.
export const GET = POST;
