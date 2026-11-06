/**
 * POST /api/checkout
 *
 * One endpoint, every payment rail.
 *
 *   1. Validate input (Zod).
 *   2. Reserve seats via the TTL cart so concurrent buyers can't double-
 *      book the last few tickets.
 *   3. Apply promo code (if any). Compute fee breakdown.
 *   4. Free orders short-circuit: tickets issued immediately, no rail.
 *   5. Otherwise: pick a provider via the router, persist Order + Payment,
 *      call `provider.charge()`, return the initiation result so the
 *      client can redirect / show a "check your phone" prompt / etc.
 *
 * Webhook callbacks finalise the payment + issue tickets in
 * `src/lib/payments/finalise.ts`.
 */

import { NextResponse } from "next/server";
import type { PaymentProvider as DbPaymentProvider } from "@prisma/client";
import { requireActiveUser, requireCompleteProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkoutSchema } from "@/lib/validators";
import { log } from "@/lib/logger";
import { hit, clientIp } from "@/lib/rate-limit";
import { makeOpaqueToken, makeTicketCode } from "@/lib/server-utils";
import {
  reserveSeats,
  bindReservationsToOrder,
  releaseReservations
} from "@/lib/reservations";
import { validatePromoCode } from "@/lib/promo";
import { computeBreakdown }  from "@/lib/platform-fee";
import { cents, money, type Currency }  from "@/lib/money";
import { convert }            from "@/lib/fx";
import { detectCurrency }     from "@/lib/geo";
import { pickProvider }       from "@/lib/payments";

// Abuse ceiling: 30 checkout attempts per minute per IP. The legitimate
// flow is one POST per buyer; spam = a script trying to hammer
// reservations or scrape provider IDs.
const CHECKOUT_LIMIT     = 30;
const CHECKOUT_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  // Profile must be set up before they can buy a ticket — guarantees
  // the order has a sensible attendee identity / verified email,
  // and surfaces a clear "finish your profile" prompt in the
  // checkout modal instead of a generic failure.
  const profileGate = await requireCompleteProfile(gate);
  if (profileGate instanceof NextResponse) return profileGate;
  const userId = profileGate.userId;

  const bucket = hit(`checkout:${clientIp(req)}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Slow down — too many checkout attempts." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { eventId, items, attendeeName, attendeeEmail } = parsed.data;

  /* ── 1. Load the event + tiers ─────────────────────────────── */
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTiers: true,
      organizer:   { include: { connectedAccounts: true } }
    }
  });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event not available" }, { status: 404 });
  }

  /* ── 2. Build line items, validate sales windows + per-tier limits ── */
  const now = new Date();
  type Line = { tierId: string; quantity: number; priceCents: number; currency: string; name: string };
  const lines: Line[] = [];
  let requestedQty = 0;
  for (const it of items) {
    const tier = event.ticketTiers.find((t) => t.id === it.tierId);
    if (!tier) return NextResponse.json({ error: "Unknown ticket tier" }, { status: 400 });
    if (tier.salesStartAt && tier.salesStartAt > now) {
      return NextResponse.json({ error: `${tier.name} isn't on sale yet.` }, { status: 400 });
    }
    if (tier.salesEndAt && tier.salesEndAt < now) {
      return NextResponse.json({ error: `${tier.name} has ended.` }, { status: 400 });
    }
    if (tier.minPerOrder && it.quantity < tier.minPerOrder) {
      return NextResponse.json(
        { error: `${tier.name}: minimum ${tier.minPerOrder} per order.` },
        { status: 400 }
      );
    }
    if (tier.maxPerOrder && it.quantity > tier.maxPerOrder) {
      return NextResponse.json(
        { error: `${tier.name}: maximum ${tier.maxPerOrder} per order.` },
        { status: 400 }
      );
    }
    lines.push({
      tierId:     tier.id,
      quantity:   it.quantity,
      priceCents: tier.priceCents,
      currency:   tier.currency,
      name:       tier.name
    });
    requestedQty += it.quantity;
  }

  // All lines must share a currency (we don't FX inside an order).
  const currency = lines[0]?.currency ?? "USD";
  for (const l of lines) {
    if (l.currency !== currency) {
      return NextResponse.json(
        { error: "Tiers in this order use different currencies." },
        { status: 400 }
      );
    }
  }
  const subtotal = money(
    lines.reduce((s, l) => s + l.priceCents * l.quantity, 0),
    currency as Currency
  );

  // Per-user limit.
  if (event.perUserLimit && event.perUserLimit > 0) {
    const already = await prisma.ticket.count({
      where: { userId, eventId, status: { in: ["ISSUED", "CHECKED_IN"] } }
    });
    if (already + requestedQty > event.perUserLimit) {
      const left = Math.max(0, event.perUserLimit - already);
      return NextResponse.json(
        {
          error:
            left === 0
              ? `You've reached the limit of ${event.perUserLimit} tickets for this event.`
              : `Limit is ${event.perUserLimit} per person — you can still buy ${left}.`
        },
        { status: 400 }
      );
    }
  }

  /* ── 3. Reserve seats (TTL cart) ───────────────────────────── */
  let reservationIds: string[];
  try {
    const r = await reserveSeats({
      userId,
      lines: lines.map((l) => ({ tierId: l.tierId, quantity: l.quantity }))
    });
    reservationIds = r.reservationIds;
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not reserve seats." },
      { status: 409 }
    );
  }

  /* ── 4. Promo code ─────────────────────────────────────────── */
  let promo:
    | { promoCodeId: string; code: string; discount: { amount: number; currency: string }; description: string | null }
    | null = null;
  if (parsed.data.promoCode) {
    try {
      const v = await validatePromoCode(parsed.data.promoCode, {
        subtotal, eventId, userId
      });
      promo = {
        promoCodeId: v.promoCodeId,
        code:        v.code,
        description: v.description,
        discount:    { amount: v.discount.amount, currency: v.discount.currency }
      };
    } catch (e) {
      await releaseReservations(reservationIds);
      return NextResponse.json(
        { error: (e as Error).message ?? "Invalid promo code." },
        { status: 400 }
      );
    }
  }

  const breakdown = computeBreakdown(
    subtotal,
    promo
      ? money(cents(promo.discount.amount), subtotal.currency)
      : money(0, subtotal.currency)
  );
  const isFree = breakdown.total.amount === 0;

  /* ── 5. Free orders: issue tickets immediately ─────────────── */
  if (isFree) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId, eventId,
            status:             "PAID",
            currency,
            subtotalCents:      subtotal.amount,
            discountCents:      breakdown.discount.amount,
            processingFeeCents: 0,
            totalCents:         0,
            platformFeeCents:   0,
            organizerNetCents:  0,
            promoCodeId:        promo?.promoCodeId ?? null
          }
        });
        for (const l of lines) {
          // Same atomic CAS as before.
          const updated: number = await tx.$executeRaw`
            UPDATE "TicketTier"
            SET "sold" = "sold" + ${l.quantity}
            WHERE "id" = ${l.tierId}
              AND "sold" + ${l.quantity} <= "quantity"
          `;
          if (updated === 0) {
            throw new Error(`No more seats for ${l.name}.`);
          }
          for (let i = 0; i < l.quantity; i++) {
            await tx.ticket.create({
              data: {
                code:          makeTicketCode(),
                qrData:        makeOpaqueToken(),
                attendeeName, attendeeEmail,
                eventId, tierId: l.tierId, orderId: created.id, userId
              }
            });
          }
        }
        if (promo) {
          await tx.promoCode.update({
            where: { id: promo.promoCodeId },
            data:  { usedCount: { increment: 1 } }
          });
        }
        return created;
      });
      // Free-order fulfilled — release the reservation rows.
      await releaseReservations(reservationIds);
      return NextResponse.json({
        orderId:     order.id,
        status:      "PAID",
        redirectUrl: `/tickets?orderId=${order.id}`
      });
    } catch (e) {
      await releaseReservations(reservationIds);
      return NextResponse.json(
        { error: (e as Error).message ?? "Could not issue tickets." },
        { status: 400 }
      );
    }
  }

  /* ── 6a. Buyer-currency FX ───────────────────────────────────────
   *  The organizer prices in `currency` (tier currency). The buyer wants
   *  to pay in *their* currency — provided either explicitly or detected
   *  from edge-geo headers. Convert here so the rail charges the right
   *  amount + the right currency for the buyer's bank to show. */
  const buyerCurrency: Currency = (parsed.data.buyerCurrency ?? detectCurrency()) as Currency;
  let chargeTotal       = breakdown.total;        // what we charge the rail
  let chargePlatformFee = breakdown.platformFee;  // application fee, same currency as charge
  if (buyerCurrency !== currency) {
    try {
      chargeTotal       = await convert(breakdown.total,        buyerCurrency);
      chargePlatformFee = await convert(breakdown.platformFee,  buyerCurrency);
    } catch (e) {
      // FX upstream + fallback both refused — bail rather than silently
      // billing in the wrong currency.
      await releaseReservations(reservationIds);
      return NextResponse.json(
        { error: `Could not convert ${currency} → ${buyerCurrency}: ${(e as Error).message}` },
        { status: 502 }
      );
    }
  }

  /* ── 6b. Pick a provider for the buyer's currency ─────────────── */
  const provider = pickProvider({
    currency:  buyerCurrency,
    preferred: parsed.data.provider as DbPaymentProvider | undefined,
    demoMode:  process.env.DEMO_CHECKOUT === "true"
  });

  // Stripe-Connect routing — only when the organizer has a verified
  // Stripe Connect account AND the provider we picked is Stripe.
  let connectAccountId: string | undefined;
  if (provider.id === "STRIPE") {
    const conn = event.organizer.connectedAccounts.find(
      (a) => a.provider === "STRIPE_CONNECT" && a.verifiedAt
    );
    if (conn) connectAccountId = conn.externalId;
  }

  const order = await prisma.order.create({
    data: {
      userId, eventId,
      status:             "PENDING",
      currency,                                                   // organizer-side currency
      subtotalCents:      subtotal.amount,
      discountCents:      breakdown.discount.amount,
      processingFeeCents: 0,
      totalCents:         breakdown.total.amount,                 // organizer-side total
      platformFeeCents:   breakdown.platformFee.amount,
      organizerNetCents:  breakdown.organizerNet.amount,
      promoCodeId:        promo?.promoCodeId ?? null
    }
  });
  await bindReservationsToOrder(reservationIds, order.id);

  let initiation;
  try {
    initiation = await provider.charge({
      orderId:       order.id,
      amount:        chargeTotal,                                  // buyer-side currency
      customerEmail: attendeeEmail,
      customerName:  attendeeName,
      msisdn:        parsed.data.msisdn,
      successUrl:    `${process.env.APP_URL ?? "http://localhost:3000"}/tickets?orderId=${order.id}`,
      cancelUrl:     `${process.env.APP_URL ?? "http://localhost:3000"}/events/${event.slug}?cancelled=1`,
      ...(connectAccountId
        ? {
            connect: {
              accountId:      connectAccountId,
              applicationFee: chargePlatformFee
            }
          }
        : {}),
      metadata: {
        eventTitle:        event.title,
        orderId:           order.id,
        organizerCurrency: currency,
        buyerCurrency
      }
    });
  } catch (e) {
    log.error("checkout: provider.charge failed", { error: (e as Error).message });
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    await releaseReservations(reservationIds);
    return NextResponse.json(
      { error: (e as Error).message ?? "Payment provider error." },
      { status: 502 }
    );
  }

  // Mobile-money "needs-input" — caller will re-POST with msisdn.
  if (initiation.kind === "needs-input") {
    // Roll back the order so the buyer doesn't see a stuck PENDING.
    await prisma.order.delete({ where: { id: order.id } });
    await releaseReservations(reservationIds);
    return NextResponse.json(
      {
        needsInput: initiation.missing,
        provider:   provider.id
      },
      { status: 400 }
    );
  }

  // Persist a Payment row referencing the provider's id. Amount + currency
  // here are the *buyer-side* values (what the rail actually charged),
  // not the organizer-side `Order.totalCents` / `Order.currency`. Keep
  // the Order row in organizer currency so revenue reports reconcile.
  await prisma.payment.create({
    data: {
      orderId:           order.id,
      provider:          provider.id,
      providerPaymentId: initiation.providerPaymentId,
      mobileMoneyMsisdn: parsed.data.msisdn,
      amountCents:       chargeTotal.amount,
      currency:          chargeTotal.currency,
      status:            initiation.kind === "captured" ? "SUCCEEDED" : "PROCESSING"
    }
  });

  // DEMO captured inline → mirror the free-order behaviour and issue tickets.
  if (initiation.kind === "captured" && provider.id === "DEMO") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      for (const l of lines) {
        const updated: number = await tx.$executeRaw`
          UPDATE "TicketTier" SET "sold" = "sold" + ${l.quantity}
          WHERE "id" = ${l.tierId} AND "sold" + ${l.quantity} <= "quantity"
        `;
        if (updated === 0) continue;
        for (let i = 0; i < l.quantity; i++) {
          await tx.ticket.create({
            data: {
              code:          makeTicketCode(),
              qrData:        makeOpaqueToken(),
              attendeeName, attendeeEmail,
              eventId, tierId: l.tierId, orderId: order.id, userId
            }
          });
        }
      }
      if (promo) {
        await tx.promoCode.update({
          where: { id: promo.promoCodeId },
          data:  { usedCount: { increment: 1 } }
        });
      }
    });
    await releaseReservations(reservationIds);
    return NextResponse.json({
      orderId:     order.id,
      status:      "PAID",
      redirectUrl: `/tickets?orderId=${order.id}&demo=1`
    });
  }

  // For mobile-push and redirect, return the initiation so the client
  // can drive the buyer to the next step.
  return NextResponse.json({
    orderId:     order.id,
    status:      "PENDING",
    initiation
  });
}
