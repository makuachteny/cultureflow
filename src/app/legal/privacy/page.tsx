export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import { BRAND_NAME, brandEmail } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${BRAND_NAME} collects, how we use it, and the choices you have. Plain language, not legalese.`
};

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      updated="April 17, 2026"
      related={[
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/refunds", label: "Refund policy" }
      ]}
    >
      <p>
        This page tells you what we collect, why, and what you can do about it.
        We wrote it in plain language; the terms you&rsquo;d find in a lawyer&rsquo;s version
        are in our <Link href="/legal/terms">terms</Link>.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><b>Account data</b> — name, email, password (hashed), and optionally city, country, community or heritage, and interests.</li>
        <li><b>Event data</b> — events you create, tickets you purchase, and anything you post publicly on the platform.</li>
        <li><b>Payment data</b> — processed by <a href="https://stripe.com/privacy">Stripe</a> (cards) or the relevant mobile-money provider. We store the last 4 digits, brand, and a Stripe reference — never the full card number.</li>
        <li><b>Device & usage</b> — IP address, browser, page visits, and error logs. We use these to keep the site up and prevent abuse.</li>
        <li><b>Cookies</b> — a session cookie to keep you signed in, and a small analytics cookie (no third-party ad trackers).</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>Run the service — show you relevant events, deliver tickets, send receipts.</li>
        <li>Keep you secure — fraud detection, rate limiting, spam prevention.</li>
        <li>Communicate — transactional email (tickets, receipts, refunds) and, only if you opt in, community announcements.</li>
        <li>Improve the product — aggregated, anonymized metrics on what works.</li>
      </ul>
      <p>We do <b>not</b> sell your data, rent it, or share it with advertisers.</p>

      <h2>3. Who we share with</h2>
      <p>Only these parties, and only with what they need to do their job:</p>
      <ul>
        <li><b>Event organizers</b> — receive the attendee name, email, and ticket tier for events you buy. They cannot see your other tickets or account data.</li>
        <li><b>Stripe</b> — processes card payments. <a href="https://stripe.com/privacy">Stripe privacy policy</a>.</li>
        <li><b>Mobile-money and local payment providers</b> — when you pay with a local rail (e.g. MTN MoMo, m-Pesa, or a regional equivalent enabled in your country), the provider receives the payment details required to authorize the charge.</li>
        <li><b>Email delivery</b> — a transactional email service handles receipts and reminders.</li>
        <li><b>Legal process</b> — if we receive a valid legal order; we&rsquo;ll push back where we can and notify you unless prohibited by law.</li>
      </ul>

      <h2>4. How long we keep it</h2>
      <ul>
        <li><b>Account data</b> — as long as your account is active, plus up to 2 years after close (tax/accounting).</li>
        <li><b>Ticket & order data</b> — 7 years, for tax and anti-fraud reasons.</li>
        <li><b>Error logs</b> — 90 days.</li>
      </ul>
      <p>Request earlier deletion: <a href={`mailto:${brandEmail("privacy")}`}>{brandEmail("privacy")}</a>.</p>

      <h2>5. Your rights</h2>
      <p>Regardless of where you live, you can:</p>
      <ul>
        <li>See what data we have about you — from your <Link href="/dashboard/settings">account settings</Link> or by emailing us.</li>
        <li>Correct inaccuracies — directly in settings.</li>
        <li>Delete your account — settings → Close account. Some records (paid orders) are kept for tax reasons.</li>
        <li>Export your data — CSV export on request.</li>
        <li>Opt out of non-transactional email — one click in any community email.</li>
      </ul>
      <p>
        If you&rsquo;re in the EU, UK, or California, you have additional rights under GDPR / UK GDPR / CCPA; the above list covers them in practice.
      </p>

      <h2>6. Children</h2>
      <p>
        The platform is for users 16 and over. We don&rsquo;t knowingly collect data from children under 16. Attendees under 16 may be bought tickets by a parent or guardian; their name is stored with the ticket but no separate account is created.
      </p>

      <h2>7. Security</h2>
      <p>
        Passwords are hashed with bcrypt. Payment data never touches our servers in the clear. We use HTTPS everywhere and audit access logs. If a breach affects you, we&rsquo;ll notify you within 72 hours where the law allows.
      </p>

      <h2>8. Changes</h2>
      <p>
        We&rsquo;ll update this page when anything material changes. If the change affects how we share your data, we&rsquo;ll email you before it takes effect.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions, corrections, deletion requests: <a href={`mailto:${brandEmail("privacy")}`}>{brandEmail("privacy")}</a>.
      </p>
    </LegalPage>
  );
}
