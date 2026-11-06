/**
 * Organizer onboarding for the mobile-money rails (M-Pesa, MoMo, m-Gurush).
 *
 * No KYC handshake here — for the mobile rails, the platform's API keys
 * authenticate every collection / disbursement; the organizer just tells
 * us which till / merchant code / payee MSISDN to route their share to.
 * CultureFlow ops verify this off-platform and stamp `verifiedAt` via the
 * admin console once the merchant agreement is on file.
 */

import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/auth";

const PAYOUT_PROVIDERS = ["MPESA_TILL", "MOMO_MERCHANT", "MGURUSH_MERCHANT"] as const;
const PAYOUT_PROVIDERS_MUTABLE: Array<typeof PAYOUT_PROVIDERS[number]> = [...PAYOUT_PROVIDERS];

const upsertSchema = z.object({
  provider:    z.enum(PAYOUT_PROVIDERS),
  externalId:  z.string().min(2).max(64),
  payeeMsisdn: z.string().regex(/^\+?\d{6,15}$/).optional(),
  label:       z.string().max(80).optional(),
  isDefault:   z.boolean().optional()
});

export async function GET() {
  const gate = await requireOrganizer();
  if (gate instanceof NextResponse) return gate;
  const accounts = await prisma.connectedAccount.findMany({
    where:   { userId: gate.userId, provider: { in: PAYOUT_PROVIDERS_MUTABLE } },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  // Mobile-money account writes; throttle scripted abuse.
  const limited = guard(req, "connect-momo", 20, 60000);
  if (limited) return limited;

  const gate = await requireOrganizer();
  if (gate instanceof NextResponse) return gate;
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Upsert by (user, provider, externalId).
  const account = await prisma.connectedAccount.upsert({
    where: {
      userId_provider_externalId: {
        userId:     gate.userId,
        provider:   data.provider,
        externalId: data.externalId
      }
    },
    update: {
      payeeMsisdn: data.payeeMsisdn,
      label:       data.label,
      isDefault:   data.isDefault ?? false
    },
    create: {
      userId:     gate.userId,
      provider:   data.provider,
      externalId: data.externalId,
      payeeMsisdn: data.payeeMsisdn,
      label:      data.label,
      isDefault:  data.isDefault ?? false
    }
  });

  // If isDefault was set, unset other defaults of the same provider.
  if (data.isDefault) {
    await prisma.connectedAccount.updateMany({
      where: {
        userId:   gate.userId,
        provider: data.provider,
        id:       { not: account.id }
      },
      data: { isDefault: false }
    });
  }

  return NextResponse.json({ account });
}
