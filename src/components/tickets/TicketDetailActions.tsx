"use client";

/**
 * TicketDetailActions — vertical stack of CTAs that sits below the QR
 * on the ticket card:
 *
 *   ┌──────────────────────────────┐
 *   │      Download tickets        │   ← window.print()
 *   ├──────────────────────────────┤
 *   │       Cancel Order           │   ← inline refund-request form
 *   └──────────────────────────────┘
 *           Contact the organizer       ← mailto link
 *
 * The "Edit" affordance on the right column links here with `?edit=1`,
 * which auto-opens the transfer form (cultureflow doesn't yet support
 * editing an attendee's name in place — reassigning via Transfer is the
 * canonical route).
 */

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  ticketId: string;
  eventTitle: string;
  organizerEmail: string;
  eventSlug: string;
  orderRef: string;
  canTransfer: boolean;
  canRefund: boolean;
  existingRefundStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
};

export default function TicketDetailActions({
  ticketId, eventTitle, organizerEmail, orderRef,
  canTransfer, canRefund, existingRefundStatus
}: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState<"transfer" | "cancel" | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transfer form
  const [toEmail, setToEmail] = useState("");
  const [toName,  setToName]  = useState("");
  // Cancel/refund form
  const [reason, setReason] = useState("");

  // Auto-open transfer form when arriving with ?edit=1 (from the
  // "Edit" link on the contact-info column).
  useEffect(() => {
    if (searchParams?.get("edit") === "1" && canTransfer) {
      setOpen("transfer");
    }
  }, [searchParams, canTransfer]);

  /** Strip the `?edit=1` (and any other transient query) from the URL
   *  so the form doesn't auto-reopen on a back/forward navigation.
   *  router.replace keeps the entry out of history. */
  const clearEditParam = useCallback(() => {
    if (!searchParams || searchParams.get("edit") !== "1") return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("edit");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : (pathname ?? ""), { scroll: false });
  }, [router, pathname, searchParams]);

  function close() {
    setOpen(null);
    setError(null);
    setSuccess(null);
    setToEmail(""); setToName(""); setReason("");
    clearEditParam();
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toEmail, toName })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Transfer failed"); return; }
      setSuccess("Ticket transferred.");
      // Outgoing nav doesn't need clearEditParam — router.push leaves
      // /tickets/<id> entirely, so the param goes with it.
      setTimeout(() => router.push("/tickets"), 1000);
    });
  }

  async function submitCancel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch(`/api/tickets/${ticketId}/refund-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Cancel request failed"); return; }
      setSuccess("Cancellation request sent to the organizer.");
      setTimeout(() => router.refresh(), 800);
    });
  }

  const organizerMailto = `mailto:${organizerEmail}?subject=${encodeURIComponent(`About my ticket for ${eventTitle}`)}&body=${encodeURIComponent(`Hi — I have a question about order #${orderRef}.\n\n`)}`;

  return (
    <div id="ticket-actions" className="mt-6 space-y-3">
      {/* Idle — stacked CTAs */}
      {!open && !success && (
        <>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full inline-flex items-center justify-center rounded-md border border-ink-400/40 bg-white px-4 py-3 text-[14px] font-semibold text-nile-900 hover:border-nile/60 hover:bg-nile-50 motion-safe:transition-colors"
          >
            Download tickets
          </button>

          {canRefund && !existingRefundStatus && (
            <button
              type="button"
              onClick={() => { setOpen("cancel"); setError(null); }}
              className="w-full inline-flex items-center justify-center rounded-md border border-ink-400/40 bg-white px-4 py-3 text-[14px] font-semibold text-nile-900 hover:border-hibiscus/60 hover:bg-hibiscus/5 motion-safe:transition-colors"
            >
              Cancel Order
            </button>
          )}

          {existingRefundStatus && (
            <div className="text-center text-[12.5px] font-semibold text-ink-600">
              Cancellation: {existingRefundStatus.toLowerCase()}
            </div>
          )}

          <Link
            href={organizerMailto}
            className="block text-center text-[14px] font-semibold text-nile hover:underline pt-1"
          >
            Contact the organizer
          </Link>
        </>
      )}

      {/* Success banner */}
      {success && (
        <div role="status" className="rounded-md bg-acacia-50 text-acacia-600 px-3 py-2 text-sm text-center font-semibold">
          {success}
        </div>
      )}

      {/* Transfer form (Edit) */}
      {open === "transfer" && !success && (
        <form
          onSubmit={submitTransfer}
          className="rounded-md ring-1 ring-[color:var(--border-hairline)] bg-white p-4 text-left"
          aria-labelledby="transfer-form-heading"
        >
          <div id="transfer-form-heading" className="text-[15px] font-bold text-nile-900">
            Edit attendee
          </div>
          <p className="mt-1 text-[12.5px] text-ink-600 leading-relaxed">
            Reassign this ticket. The new attendee will receive a fresh QR + code; yours
            will stop working at the door.
          </p>
          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-ink-900">Recipient name</span>
            <input
              required
              className="input mt-1"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              autoComplete="name"
              placeholder="Mary Nyandeng"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-ink-900">Recipient email</span>
            <input
              required
              type="email"
              className="input mt-1"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              autoComplete="email"
              placeholder="friend@email.com"
            />
          </label>
          {error && (
            <div role="alert" className="mt-2 text-[12px] font-semibold text-hibiscus">
              {error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={close} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Cancel form */}
      {open === "cancel" && !success && (
        <form
          onSubmit={submitCancel}
          className="rounded-md ring-1 ring-[color:var(--border-hairline)] bg-white p-4 text-left"
          aria-labelledby="cancel-form-heading"
        >
          <div id="cancel-form-heading" className="text-[15px] font-bold text-nile-900">
            Cancel this order
          </div>
          <p className="mt-1 text-[12.5px] text-ink-600 leading-relaxed">
            The organizer reviews cancellations per their posted policy. You&rsquo;ll see
            the decision on this page once they respond.
          </p>
          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-ink-900">Why are you cancelling?</span>
            <textarea
              required minLength={4} maxLength={2000} rows={4}
              className="textarea mt-1" value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Schedule conflict, duplicate purchase, etc."
            />
          </label>
          {error && (
            <div role="alert" className="mt-2 text-[12px] font-semibold text-hibiscus">
              {error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Submitting…" : "Send request"}
            </button>
            <button type="button" onClick={close} className="btn btn-ghost btn-sm">
              Keep ticket
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
