/**
 * Stripe Connect onboarding for organizers.
 *
 * POST /api/connect/stripe
 *   – If the organizer doesn't have a Connect account yet, create one
 *     (Express acct), upsert into ConnectedAccount, then create a one-shot
 *     account-link URL and return it.
 *   – If they do, return a fresh account-link so they can finish KYC.
 *
 * The actual capability/verification status is read by the GET handler.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/auth";
import { stripeClient, stripeIsEnabled } from "@/lib/payments/stripe";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  const limited = guard(req, "connect-stripe", 20, 60000);
  if (limited) return limited;

  const gate = await requireOrganizer();
  if (gate instanceof NextResponse) return gate;
  if (!stripeIsEnabled()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 501 });
  }
  const stripe = stripeClient();

  const user = await prisma.user.findUniqueOrThrow({
    where:  { id: gate.userId },
    select: { email: true, name: true, country: true }
  });

  // Reuse an existing Stripe-Connect record if one is present.
  let connected = await prisma.connectedAccount.findFirst({
    where: { userId: gate.userId, provider: "STRIPE_CONNECT" }
  });

  if (!connected) {
    const acct = await stripe.accounts.create({
      type:  "express",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers:     { requested: true }
      },
      business_type: "individual",
      metadata: { userId: gate.userId }
    });
    connected = await prisma.connectedAccount.create({
      data: {
        userId:     gate.userId,
        provider:   "STRIPE_CONNECT",
        externalId: acct.id,
        label:      "Stripe Connect",
        isDefault:  true
      }
    });
    log.info("connect.stripe: created Connect account", {
      userId: gate.userId, acct: acct.id
    });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account:     connected.externalId,
    refresh_url: `${appUrl}/dashboard/payouts?refresh=1`,
    return_url:  `${appUrl}/dashboard/payouts?return=1`,
    type:        "account_onboarding"
  });

  return NextResponse.json({
    url: link.url,
    accountId: connected.externalId
  });
}

export async function GET(req: Request) {
  const limited = guard(req, "connect-stripe", 20, 60000);
  if (limited) return limited;

  const gate = await requireOrganizer();
  if (gate instanceof NextResponse) return gate;
  if (!stripeIsEnabled()) {
    return NextResponse.json({ enabled: false });
  }
  const stripe = stripeClient();
  const connected = await prisma.connectedAccount.findFirst({
    where: { userId: gate.userId, provider: "STRIPE_CONNECT" }
  });
  if (!connected) {
    return NextResponse.json({ enabled: false });
  }
  const acct = await stripe.accounts.retrieve(connected.externalId);
  const verified = !!acct.charges_enabled && !!acct.payouts_enabled;
  // Persist the verification stamp once the account flips to enabled.
  if (verified && !connected.verifiedAt) {
    await prisma.connectedAccount.update({
      where: { id: connected.id },
      data:  { verifiedAt: new Date() }
    });
  }
  return NextResponse.json({
    enabled:      true,
    accountId:    connected.externalId,
    chargesEnabled:  acct.charges_enabled ?? false,
    payoutsEnabled:  acct.payouts_enabled ?? false,
    requirementsDue: (acct.requirements?.currently_due ?? []).length,
    verifiedAt:   connected.verifiedAt
  });
}
