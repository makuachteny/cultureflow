/**
 * Edit / delete an existing promo code.
 *
 * Loads the code, checks ownership (organizer must own the scoped event,
 * or be ADMIN for global codes), and hands the same PromoForm used for
 * /new — passing `promoCodeId` flips the form into edit mode.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardHero from "@/components/organizer/DashboardHero";
import PromoForm from "../PromoForm";

export const dynamic = "force-dynamic";

function toLocalInput(d: Date | null): string | undefined {
  if (!d) return undefined;
  // datetime-local needs YYYY-MM-DDTHH:mm in the user's TZ.
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditPromoCodePage({
  params
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/sign-in?callbackUrl=/dashboard/marketing/promos/${params.id}`);

  const code = await prisma.promoCode.findUnique({
    where:   { id: params.id },
    include: { event: { select: { id: true, title: true, organizerId: true } } }
  });
  if (!code) notFound();

  const role = session.user.role;
  const ownsIt =
    role === "ADMIN" ||
    (code.event && code.event.organizerId === session.user.id);
  if (!ownsIt) redirect("/dashboard/marketing?tab=promos");

  const events = await prisma.event.findMany({
    where: {
      organizerId: session.user.id,
      status:      { in: ["DRAFT", "PUBLISHED"] },
      endsAt:      { gte: new Date() }
    },
    select:  { id: true, title: true },
    orderBy: { startsAt: "asc" },
    take:    50
  });

  // Display value: percent stays whole, fixed cents goes back to major units.
  const displayValue =
    code.discountType === "PERCENT"
      ? code.discountValue
      : code.discountValue / 100;

  return (
    <div className="w-full">
      <DashboardHero
        tone="acacia"
        eyebrow="Marketing · Promotions"
        title="Edit code"
        accent={code.code}
        lede={`Used ${code.usedCount} time${code.usedCount === 1 ? "" : "s"} so far. Changes apply to future redemptions only — past orders keep the discount they were charged.`}
        ctas={[
          { label: "All promo codes", href: "/dashboard/marketing?tab=promos", variant: "primary" }
        ]}
      />

      <div className="max-w-2xl">
        <Link
          href="/dashboard/marketing?tab=promos"
          className="text-[13px] font-semibold text-ink-600 hover:text-nile-900 inline-flex items-center gap-1 mb-4"
        >
          <span aria-hidden>‹</span> Back to all codes
        </Link>
        <PromoForm
          events={events}
          promoCodeId={code.id}
          initial={{
            code:          code.code,
            description:   code.description ?? undefined,
            discountType:  code.discountType,
            discountValue: displayValue,
            eventId:       code.eventId,
            startsAt:      toLocalInput(code.startsAt),
            endsAt:        toLocalInput(code.endsAt),
            maxUses:       code.maxUses    ?? undefined,
            maxPerUser:    code.maxPerUser ?? undefined,
            active:        code.active
          }}
        />
      </div>
    </div>
  );
}
