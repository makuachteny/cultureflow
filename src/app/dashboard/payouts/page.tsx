/**
 * Organizer payout settings.
 *
 * Two cards:
 *   1. Stripe Connect — onboards the organizer's connected account so
 *      cards (anywhere in the world) and Apple Pay / Google Pay land in
 *      THEIR Stripe balance, not ours. We only keep the platform fee.
 *   2. Mobile-money payouts — for M-Pesa / MoMo / m-Gurush, the
 *      organizer registers a till / merchant code / payee MSISDN and
 *      CultureFlow ops verify it. Once verified, all on-rail collections
 *      sweep there.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardHero from "@/components/organizer/DashboardHero";
import StripeConnectCard from "./StripeConnectCard";
import MobileMoneyAccountsCard from "./MobileMoneyAccountsCard";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard/payouts");
  const user = await prisma.user.findUniqueOrThrow({
    where:  { id: session.user.id },
    select: {
      role: true,
      connectedAccounts: { orderBy: { createdAt: "asc" } }
    }
  });
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    redirect("/dashboard?error=organizer-only");
  }

  type MobileProvider = "MPESA_TILL" | "MOMO_MERCHANT" | "MGURUSH_MERCHANT";
  const isMobileProvider = (p: string): p is MobileProvider =>
    p === "MPESA_TILL" || p === "MOMO_MERCHANT" || p === "MGURUSH_MERCHANT";

  const stripeConnect  = user.connectedAccounts.find((a) => a.provider === "STRIPE_CONNECT");
  const mobileAccounts = user.connectedAccounts
    .filter((a) => isMobileProvider(a.provider))
    .map((a) => ({ ...a, provider: a.provider as MobileProvider }));

  // KPI: how many active payout rails are connected.
  const verifiedCount = user.connectedAccounts.filter((a) => a.verifiedAt).length;
  const totalCount    = user.connectedAccounts.length;

  return (
    <div className="w-full">
      <DashboardHero
        tone="hibiscus"
        eyebrow="Get paid"
        title="Money lands"
        accent="in your account."
        lede="Connect at least one payout rail so attendee payments actually reach you. Stripe Connect handles cards anywhere; M-Pesa, MoMo and m-Gurush handle local mobile money."
        ctas={[
          { label: "Finance overview", href: "/dashboard/finance",            variant: "primary" },
          { label: "Fee model",        href: "/dashboard/settings?tab=fees",  variant: "ghost"   }
        ]}
        kpi={{
          label:   "Verified rails",
          value:   `${verifiedCount} / ${totalCount || 0}`,
          caption: verifiedCount === 0
            ? "Add your first payout method below"
            : `${totalCount - verifiedCount} pending verification`
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <StripeConnectCard
          accountId={stripeConnect?.externalId ?? null}
          verifiedAt={stripeConnect?.verifiedAt?.toISOString() ?? null}
        />
        <MobileMoneyAccountsCard
          initialAccounts={mobileAccounts.map((a) => ({
            id:          a.id,
            provider:    a.provider,
            externalId:  a.externalId,
            payeeMsisdn: a.payeeMsisdn,
            label:       a.label,
            verifiedAt:  a.verifiedAt?.toISOString() ?? null,
            isDefault:   a.isDefault
          }))}
        />
      </div>
    </div>
  );
}
