/**
 * GET /api/exports/orders
 * CSV of every order on the authenticated organizer's events —
 * PAID, PENDING, FAILED, REFUNDED all included so the report matches
 * what the organizer sees on the Orders page.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv, csvResponse, todayStamp } from "@/lib/csv";

export const dynamic = "force-dynamic";

const EXPORT_CAP = 50_000;

export async function GET(req: Request) {
  const limited = guard(req, "exports-orders", 10, 60000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const orders = await prisma.order.findMany({
    where: { event: { organizerId: gate.userId } },
    orderBy: { createdAt: "desc" },
    take: EXPORT_CAP,
    include: {
      event: { select: { title: true, slug: true } },
      user:  { select: { email: true, name: true } },
      payment: { select: { provider: true, status: true, providerPaymentId: true } },
      _count: { select: { tickets: true } }
    }
  });

  const rows = orders.map((o) => ({
    order_id:       o.id,
    created_at:     o.createdAt.toISOString(),
    event:          o.event.title,
    event_slug:     o.event.slug,
    buyer_name:     o.user?.name  ?? "",
    buyer_email:    o.user?.email ?? "",
    status:         o.status,
    tickets:        o._count.tickets,
    total_cents:    o.totalCents,
    currency:       o.currency,
    pay_provider:   o.payment?.provider ?? "",
    pay_status:     o.payment?.status   ?? "",
    pay_provider_id: o.payment?.providerPaymentId ?? ""
  }));

  return csvResponse(toCsv(rows), `orders-${todayStamp()}.csv`);
}
