/**
 * Periodic flip of finished events from PUBLISHED → PAST.
 *
 * Public listings (browse, category, city, home, organizer page) all
 * filter on `status: PUBLISHED`, so once an event row is flipped to
 * PAST it disappears from those surfaces automatically — without any
 * date arithmetic at query time.
 *
 * Run this hourly (or every 15 min for tighter freshness). Cheap: a
 * single UPDATE keyed on the (status, endsAt) index.
 *
 * Authentication: same pattern as sweep-reservations — requires
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const result = await prisma.event.updateMany({
    where: { status: "PUBLISHED", endsAt: { lt: now } },
    data:  { status: "PAST" }
  });

  if (result.count > 0) {
    log.info("expire-events.flip", { flipped: result.count, at: now.toISOString() });
  }

  return NextResponse.json({ ok: true, expired: result.count });
}

export const GET = POST;
