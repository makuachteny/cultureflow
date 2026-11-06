/**
 * GET /api/exports/payouts
 * Paid orders broken out by gross / service fee / net, using the same
 * fee model the organizer has selected in Settings. Until a Payout table
 * exists this derives rows from Order + Payment.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv, csvResponse, todayStamp } from "@/lib/csv";
import { inferMethod, readFeeModel, splitAmount } from "@/lib/finance";

export const dynamic = "force-dynamic";

const EXPORT_CAP = 50_000;

export async function GET(req: Request) {
  const limited = guard(req, "exports-payouts", 10, 60000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const orders = await prisma.order.findMany({
    where: { status: "PAID", event: { organizerId: gate.userId } },
    orderBy: { createdAt: "desc" },
    take: EXPORT_CAP,
    include: {
      event: { select: { title: true, slug: true } },
      payment: { select: { provider: true, providerPaymentId: true, status: true } }
    }
  });

  const model = readFeeModel();
  const rows = orders.map((o) => {
    const method = inferMethod(o.payment?.provider);
    const split = splitAmount(o.totalCents, method, model);
    return {
      order_id:        o.id,
      paid_at:         o.createdAt.toISOString(),
      event:           o.event.title,
      event_slug:      o.event.slug,
      method:          method === "card" ? "card" : "mobile_money",
      fee_model:       model,
      gross_cents:     split.grossCents,
      fee_cents:       split.feeCents,
      net_cents:       split.netCents,
      currency:        o.currency,
      pay_provider:    o.payment?.provider        ?? "",
      pay_status:      o.payment?.status          ?? "",
      pay_provider_id: o.payment?.providerPaymentId ?? ""
    };
  });

  return csvResponse(toCsv(rows), `payouts-${todayStamp()}.csv`);
}
