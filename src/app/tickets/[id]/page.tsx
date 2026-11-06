import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { BRAND_NAME, brandEmail } from "@/lib/brand";
import { PLACEHOLDER_BANNER } from "@/lib/stock-photos";
import TicketDetailActions from "@/components/tickets/TicketDetailActions";

export const dynamic = "force-dynamic";

const niceTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const niceDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric"
});
const longTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      event: { include: { organizer: { select: { id: true, name: true, email: true } } } },
      tier: true,
      refundRequest: true,
      order: true
    }
  });
  if (!ticket || ticket.userId !== session.user.id) return notFound();

  // Order-mate count — "Ticket N of M" requires the rest of the order.
  const orderMates = await prisma.ticket.findMany({
    where: { orderId: ticket.orderId },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  const ticketNumber = orderMates.findIndex((t) => t.id === ticket.id) + 1;
  const ticketCount  = orderMates.length;

  const qrLargeDataUrl = await QRCode.toDataURL(ticket.qrData, {
    margin: 1, width: 480, errorCorrectionLevel: "M"
  });
  const qrSmallDataUrl = await QRCode.toDataURL(ticket.qrData, {
    margin: 1, width: 220, errorCorrectionLevel: "M"
  });

  const eventStarted = ticket.event.startsAt <= new Date();
  const canTransfer  = ticket.status === "ISSUED" && !eventStarted;
  const canRefund    = ticket.status === "ISSUED";

  const venue   = ticket.event.venueName ?? (ticket.event.type === "ONLINE" ? "Online event" : "Venue TBA");
  const banner  = ticket.event.bannerUrl || PLACEHOLDER_BANNER;
  const orderId = ticket.orderId;
  const orderRef = orderId.slice(-10).toUpperCase();
  const isFree   = ticket.tier.priceCents === 0;

  // Split attendee name for the contact-info column on the right.
  const nameParts = (ticket.attendeeName || "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName  = nameParts.slice(1).join(" ");

  const fullAddress = [
    ticket.event.venueName,
    ticket.event.venueAddress,
    [ticket.event.city, ticket.event.country].filter(Boolean).join(", ")
  ].filter(Boolean).join(", ");

  const reportMailto = `mailto:${brandEmail("abuse")}?subject=${encodeURIComponent(`Report: ${ticket.event.title}`)}&body=${encodeURIComponent(`Reporting this event: ${ticket.event.slug}\n\nReason:\n`)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Top action bar — hidden when printing */}
      <div className="no-print mb-4">
        <Link href="/tickets" className="text-[13px] text-ink-600 hover:text-nile inline-flex items-center gap-1.5">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16l-6-6 6-6" />
          </svg>
          All tickets
        </Link>
      </div>

      {/* ─── Screen layout ─── */}
      <div className="no-print grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
        {/* LEFT — compact ticket card */}
        <article
          aria-label={`Ticket for ${ticket.event.title}`}
          className="rounded-xl bg-white shadow-card ring-1 ring-[color:var(--border-hairline)] overflow-hidden"
        >
          {/* Banner — square crop so the card stays narrow but the artwork
              lands as a strong visual anchor. */}
          <div className="relative aspect-square w-full bg-nile-50">
            <Image
              src={banner}
              alt=""
              fill
              sizes="(max-width:1024px) 100vw, 420px"
              className="object-cover"
              priority
            />
          </div>

          <div className="p-5 sm:p-6">
            <h1 className="font-display text-[22px] sm:text-[24px] font-extrabold text-nile-900 tracking-tight leading-[1.15]">
              {ticket.event.title}
            </h1>
            <div className="mt-2 text-[14px] text-ink-700 font-tabular">
              {niceDate.format(ticket.event.startsAt)} · {niceTime.format(ticket.event.startsAt)}
            </div>
            <div className="mt-1 text-[14px] text-ink-700 truncate">{venue}</div>

            {/* QR */}
            <div className="mt-6 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrLargeDataUrl}
                alt="Ticket QR code"
                className="block h-56 w-56 rounded-md ring-1 ring-[color:var(--border-hairline)] bg-white p-2"
              />
              <div className="mt-3 text-[13px] text-ink-600">
                {ticket.tier.name} · Ticket {ticketNumber} of {ticketCount}
              </div>
            </div>

            {/* Actions */}
            <TicketDetailActions
              ticketId={ticket.id}
              eventTitle={ticket.event.title}
              organizerEmail={ticket.event.organizer?.email ?? brandEmail("support")}
              eventSlug={ticket.event.slug}
              orderRef={orderRef}
              canTransfer={canTransfer}
              canRefund={canRefund}
              existingRefundStatus={ticket.refundRequest?.status ?? null}
            />
          </div>

          {/* Footer order-info */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1">
            <div className="border-t border-[color:var(--border-hairline)] pt-4 text-[12.5px] text-ink-600">
              {isFree ? "Free Order" : "Order"} {orderRef} on {formatDate(ticket.createdAt)}
            </div>
            <a href={reportMailto} className="mt-2 inline-block text-[13px] font-semibold text-nile hover:underline">
              Report this event
            </a>
          </div>
        </article>

        {/* RIGHT — contact information panel */}
        <section aria-labelledby="ticket-contact-heading">
          <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--border-hairline)] pb-3">
            <h2 id="ticket-contact-heading" className="font-display text-[22px] sm:text-[24px] font-bold text-nile-900 tracking-tight">
              {ticket.tier.name}
            </h2>
            {canTransfer && (
              <Link
                href={`/tickets/${ticket.id}?edit=1#ticket-actions`}
                scroll
                className="inline-flex items-center gap-1 text-[14px] font-semibold text-nile hover:underline"
                aria-label="Edit attendee details"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                Edit
              </Link>
            )}
          </div>

          <div className="mt-6">
            <h3 className="font-display text-[18px] font-bold text-nile-900">Contact Information</h3>

            <dl className="mt-4 space-y-5 text-[14px]">
              <Field label="First Name" required value={firstName || "—"} />
              <Field label="Last Name"  required value={lastName  || "—"} />
              <Field label="Email"      required value={ticket.attendeeEmail} />
              <Field label="Delivery Method"      value="eTicket" />
            </dl>
          </div>

          <p className="mt-8 text-[12.5px] text-ink-500 leading-relaxed">
            Save this ticket to your phone or print it. The QR or 6-character code on the
            ticket is what door staff will scan. The ticket is valid only for the named
            attendee — use Edit to reassign it.
          </p>
        </section>
      </div>

      {/* ─── Printable ticket — hidden on screen, only renders on
            window.print(). Layout: brand bar, event card with
            small thumbnail + small QR, ticket-number string. ─── */}
      <PrintableTicket
        title={ticket.event.title}
        tierName={ticket.tier.name}
        venue={venue}
        address={fullAddress}
        startsAt={ticket.event.startsAt}
        endsAt={ticket.event.endsAt}
        attendeeName={ticket.attendeeName}
        createdAt={ticket.createdAt}
        orderRef={orderRef}
        ticketCode={ticket.code}
        bannerUrl={banner}
        qrDataUrl={qrSmallDataUrl}
        isFree={isFree}
      />
    </div>
  );
}

/* ─────────────── Helpers ─────────────── */

function Field({ label, value, required }: { label: string; value: string; required?: boolean }) {
  return (
    <div>
      <dt className="text-[14px] font-semibold text-ink-900">
        {label}{required && <span className="text-hibiscus ml-0.5">*</span>}
      </dt>
      <dd className="mt-1 text-ink-600 break-words">{value}</dd>
    </div>
  );
}

function PrintableTicket({
  title, tierName, venue, address, startsAt, endsAt, attendeeName,
  createdAt, orderRef, ticketCode, bannerUrl, qrDataUrl, isFree
}: {
  title: string;
  tierName: string;
  venue: string;
  address: string;
  startsAt: Date;
  endsAt: Date;
  attendeeName: string;
  createdAt: Date;
  orderRef: string;
  ticketCode: string;
  bannerUrl: string;
  qrDataUrl: string;
  isFree: boolean;
}) {
  const startLabel = `${longDate.format(startsAt)} from ${niceTime.format(startsAt)} to ${longTime.format(endsAt)}`;
  const orderedAt = `${formatDate(createdAt)}`;
  return (
    <div className="ticket-print-only ticket-printable" aria-hidden>
      {/* Brand bar */}
      <div className="tp-brand">
        <span className="tp-brand-name">{BRAND_NAME}</span>
        <span className="tp-order">Order #{orderRef}</span>
      </div>

      {/* Card */}
      <div className="tp-card">
        <div className="tp-card-body">
          <h1 className="tp-title">{title}</h1>
          <h2 className="tp-tier">{tierName}</h2>
          <div className="tp-venue">{address || venue}</div>
          <div className="tp-time">{startLabel}</div>
          <div className="tp-meta-label">{isFree ? "Free Order" : "Order"}</div>
          <div className="tp-meta-sub">Order Information</div>
          <div className="tp-meta">
            Order #{orderRef}. Ordered by {attendeeName} on {orderedAt}
          </div>
        </div>
        <div className="tp-card-aside">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt="" className="tp-thumb" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="" className="tp-qr" />
          <div className="tp-code">{ticketCode}</div>
        </div>
      </div>
    </div>
  );
}
