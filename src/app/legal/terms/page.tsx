export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import { BRAND_NAME, brandEmail } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The rules for using ${BRAND_NAME}: accounts, events, payments, and what happens when things go wrong.`
};

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of service"
      updated="April 17, 2026"
      related={[
        { href: "/legal/privacy", label: "Privacy policy" },
        { href: "/legal/refunds", label: "Refund policy" }
      ]}
    >
      <p>
        These are the rules for using {BRAND_NAME} (&ldquo;{BRAND_NAME},&rdquo; &ldquo;we,&rdquo; &ldquo;the platform&rdquo;). By creating an account, buying a ticket, or hosting an event, you agree to them. If you don&rsquo;t, don&rsquo;t use the service.
      </p>

      <h2>1. Who can use {BRAND_NAME}</h2>
      <p>
        You must be at least 16 years old and provide accurate information. You&rsquo;re responsible for what happens on your account — keep your password safe and don&rsquo;t share it.
      </p>

      <h2>2. Your content</h2>
      <p>
        Whatever you post — events, profile information, comments — you keep owning. You grant us a limited license to display and distribute it on the platform (we can&rsquo;t show an event without that). If you delete your content, we&rsquo;ll stop displaying it within a reasonable time (backups and already-issued tickets may retain it for operational reasons).
      </p>

      <h2>3. Hosting events</h2>
      <p>As an organizer:</p>
      <ul>
        <li>You&rsquo;re responsible for the event — permits, venue agreements, safety, insurance, taxes. {BRAND_NAME} is a ticketing platform, not an event producer.</li>
        <li>Your descriptions, prices, dates, and refund policy must be accurate and kept up to date.</li>
        <li>If you cancel an event, you must issue refunds within 7 days. If you don&rsquo;t, we&rsquo;ll issue them for you from payouts we&rsquo;re holding.</li>
        <li>You must comply with local law. We don&rsquo;t allow events that incite violence, promote hate, sell unlicensed goods, or violate copyright.</li>
      </ul>

      <h2>4. Buying tickets</h2>
      <p>As an attendee:</p>
      <ul>
        <li>A ticket is a revocable license to attend, not a property right. Organizers can refuse entry for the reasons stated on the event page (e.g. prohibited items, age restrictions).</li>
        <li>Refunds follow our <Link href="/legal/refunds">refund policy</Link> and the organizer&rsquo;s own policy.</li>
        <li>Tickets can be transferred if the organizer enables it; reselling a ticket for more than face value is prohibited.</li>
      </ul>

      <h2>5. Fees &amp; payouts</h2>
      <p>
        Current platform fees are on the <Link href="/pricing">pricing page</Link>. Organizer payouts happen after the event via the rail they selected (Stripe bank transfer or mobile money). We may hold funds to cover chargebacks or refund risk in line with normal marketplace practice; you&rsquo;ll see any hold in your dashboard.
      </p>

      <h2>6. Prohibited uses</h2>
      <p>Don&rsquo;t use {BRAND_NAME} to:</p>
      <ul>
        <li>Break the law or facilitate someone else breaking it.</li>
        <li>Harass, threaten, or impersonate other people.</li>
        <li>Scrape, mass-download, or resell platform data.</li>
        <li>Circumvent security, rate limits, or fee structure.</li>
        <li>Post hate speech, incitement, or sexual content involving minors.</li>
      </ul>
      <p>
        We may remove content, suspend accounts, or refer to law enforcement in serious cases. We&rsquo;ll try to give you notice and a path to appeal except where an urgent response is required.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        &ldquo;{BRAND_NAME},&rdquo; our logo, and the site&rsquo;s design are ours. Event content belongs to the organizers that posted it. If you think someone has posted content that infringes your copyright, email <a href={`mailto:${brandEmail("copyright")}`}>{brandEmail("copyright")}</a> with the details — we respond to valid DMCA-style notices.
      </p>

      <h2>8. Warranties &amp; liability</h2>
      <p>
        We try hard to keep the service up and accurate but we provide it &ldquo;as is.&rdquo; We&rsquo;re not liable for events run by third-party organizers or for indirect/consequential damages. Our total liability to you for anything arising out of {BRAND_NAME} is limited to the greater of (a) what you paid us in the last 12 months or (b) US $100.
      </p>
      <p>
        Nothing in these terms limits liability that cannot be limited by law (for example, fraud or gross negligence).
      </p>

      <h2>9. Account closure</h2>
      <p>
        You can close your account anytime from <Link href="/dashboard/settings">settings</Link>. We can suspend or close an account for violations of these terms. Outstanding obligations — paying out organizers, delivering tickets, issuing refunds — survive closure.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        If we change anything material, we&rsquo;ll email account holders and post the change here with a new date. Continued use after the effective date means you accept the update; if you don&rsquo;t, close your account.
      </p>

      <h2>11. Governing law &amp; disputes</h2>
      <p>
        These terms are governed by the laws of the jurisdiction where {BRAND_NAME} is incorporated. Nothing here prevents you from bringing small-claims actions where you live.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${brandEmail("legal")}`}>{brandEmail("legal")}</a>.
      </p>
    </LegalPage>
  );
}
