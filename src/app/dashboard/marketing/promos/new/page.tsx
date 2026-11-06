/**
 * Create a new promo code.
 *
 * Pulls the organizer's events for the optional `event` scope, then
 * delegates to a client form that POSTs to /api/promo-codes.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardHero from "@/components/organizer/DashboardHero";
import PromoForm from "../PromoForm";

export const dynamic = "force-dynamic";

export default async function NewPromoCodePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/marketing/promos/new");

  const events = await prisma.event.findMany({
    where: {
      organizerId: session.user.id,
      status:      { in: ["DRAFT", "PUBLISHED"] },
      // Hide events whose end date has passed — a promo on a finished
      // event can't redeem, so don't offer it as a scope.
      endsAt:      { gte: new Date() }
    },
    select:  { id: true, title: true },
    orderBy: { startsAt: "asc" },
    take:    50
  });

  return (
    <div className="w-full">
      <DashboardHero
        tone="acacia"
        eyebrow="Marketing · Promotions"
        title="A discount code,"
        accent="ready in seconds."
        lede="Pick a code, a discount, and an optional event scope. Buyers enter the code at checkout and the platform applies the math (we clamp to the order subtotal so totals can never go negative)."
        ctas={[
          { label: "All promo codes",    href: "/dashboard/marketing?tab=promos", variant: "primary" }
        ]}
      />

      <div className="max-w-2xl">
        <Link
          href="/dashboard/marketing?tab=promos"
          className="text-[13px] font-semibold text-ink-600 hover:text-nile-900 inline-flex items-center gap-1 mb-4"
        >
          <span aria-hidden>‹</span> Back to all codes
        </Link>
        <PromoForm events={events} />
      </div>
    </div>
  );
}
