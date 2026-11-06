export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import { BRAND_NAME, brandEmail } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Refund policy",
  description: `When and how refunds happen on ${BRAND_NAME}: cancelled events, organizer-set policies, and payment-method specifics.`
};

export default function RefundPolicy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund policy"
      updated="April 17, 2026"
      related={[
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/privacy", label: "Privacy policy" }
      ]}
    >
      <h2>1. When you&rsquo;re automatically refunded</h2>
      <p>
        If an event is <b>cancelled</b> by the organizer or by us, every paid ticket is refunded in full — automatically. No forms, no chase.
        Card refunds arrive in 2–7 business days. Mobile money refunds land in minutes.
      </p>

      <h2>2. Organizer-set policies</h2>
      <p>
        For non-cancellation cases (you can no longer attend, plans changed, etc.), the refund policy is set by the event organizer and is shown on the event page before you purchase.
        Policies vary — some organizers allow full refunds up to 48 hours before the event; others are final-sale. Always read the policy before buying.
      </p>

      <h2>3. Transfers as an alternative</h2>
      <p>
        If the organizer has enabled transfers, you can send your ticket to another person from your <Link href="/tickets">My tickets</Link> page — no refund required.
      </p>

      <h2>4. Chargebacks and disputes</h2>
      <p>
        Chargebacks filed with your card issuer bypass organizer policy but may delay resolution by weeks. We recommend contacting the organizer or our support team first — most issues resolve faster that way.
      </p>

      <h2>5. Platform fees</h2>
      <p>
        On automatic (cancellation) refunds, we return 100% of what you paid — our fee is included. On organizer-discretionary refunds, processing fees on the underlying payment rail (Stripe, mobile money) may be non-refundable; the exact treatment depends on the provider.
      </p>

      <h2>6. How to request a refund</h2>
      <p>
        From your <Link href="/tickets">My tickets</Link> page, open the ticket and use &ldquo;Request refund.&rdquo;
        For urgent cases (you&rsquo;ve been charged incorrectly, for example), email <a href={`mailto:${brandEmail("help")}`}>{brandEmail("help")}</a> with your order ID.
      </p>
    </LegalPage>
  );
}
