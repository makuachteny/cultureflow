"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Attendee-facing actions on a ticket detail page. Two flows:
 *   • Transfer — reassign the ticket to another email. Calls
 *     POST /api/tickets/{id}/transfer. Redirects back to /tickets
 *     on success (the ticket leaves the current user's inbox).
 *   • Refund request — create a RefundRequest with a reason. Calls
 *     POST /api/tickets/{id}/refund-request. Disables the button
 *     once a request exists.
 *
 * Both forms are inline (no modal) to keep the component server-safe —
 * each opens/closes in place via local state.
 */
export default function TicketActions({
  ticketId,
  canTransfer,
  canRefund,
  existingRefundStatus
}: {
  ticketId: string;
  canTransfer: boolean;
  canRefund: boolean;
  existingRefundStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"transfer" | "refund" | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transfer form
  const [toEmail, setToEmail] = useState("");
  const [toName,  setToName]  = useState("");

  // Refund form
  const [reason, setReason] = useState("");

  function close() {
    setOpen(null);
    setError(null);
    setSuccess(null);
    setToEmail(""); setToName(""); setReason("");
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
      if (!res.ok) {
        setError(data.error ?? "Transfer failed");
        return;
      }
      setSuccess("Ticket transferred.");
      setTimeout(() => router.push("/tickets"), 1000);
    });
  }

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await fetch(`/api/tickets/${ticketId}/refund-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Refund request failed");
        return;
      }
      setSuccess("Refund request sent to the organizer.");
      setTimeout(() => router.refresh(), 800);
    });
  }

  return (
    <div className="mt-5 space-y-3">
      {/* Idle CTA row */}
      {!open && (
        <div className="flex flex-wrap justify-center gap-2">
          {canTransfer && (
            <button
              type="button"
              onClick={() => { setOpen("transfer"); setError(null); setSuccess(null); }}
              className="btn btn-outline btn-sm"
            >
              Transfer ticket
            </button>
          )}
          {canRefund && !existingRefundStatus && (
            <button
              type="button"
              onClick={() => { setOpen("refund"); setError(null); setSuccess(null); }}
              className="btn btn-ghost btn-sm"
            >
              Request refund
            </button>
          )}
          {existingRefundStatus && (
            <span className="chip chip-gold">
              Refund request: {existingRefundStatus.toLowerCase()}
            </span>
          )}
        </div>
      )}

      {/* Success banner — shown briefly before redirect/refresh */}
      {success && (
        <div role="status" className="rounded-lg bg-acacia-50 text-acacia-600 px-3 py-2 text-sm text-center font-semibold">
          {success}
        </div>
      )}

      {/* Transfer form */}
      {open === "transfer" && !success && (
        <form
          onSubmit={submitTransfer}
          className="rounded-md bg-white shadow-sm p-4 text-left"
          aria-labelledby="transfer-form-heading"
        >
          <div id="transfer-form-heading" className="text-sm font-semibold text-nile-900">
            Transfer this ticket
          </div>
          <p className="mt-1 text-[12px] text-ink-600">
            The new attendee will get the ticket in their &ldquo;My tickets&rdquo; if they have an account.
            Either way the QR + 6-character code re-issue to them at the door.
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "transfer-error" : undefined}
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "transfer-error" : undefined}
            />
          </label>
          {error && (
            <div id="transfer-error" role="alert" className="mt-2 text-[12px] font-semibold text-hibiscus">
              {error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Transferring…" : "Confirm transfer"}
            </button>
            <button type="button" onClick={close} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Refund form */}
      {open === "refund" && !success && (
        <form
          onSubmit={submitRefund}
          className="rounded-md bg-white shadow-sm p-4 text-left"
          aria-labelledby="refund-form-heading"
        >
          <div id="refund-form-heading" className="text-sm font-semibold text-nile-900">
            Request a refund
          </div>
          <p className="mt-1 text-[12px] text-ink-600">
            The organizer reviews refund requests per their posted policy.
            You&rsquo;ll see the decision here once they respond.
          </p>
          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-ink-900">Why are you asking for a refund?</span>
            <textarea
              required minLength={4} maxLength={2000} rows={4}
              className="textarea mt-1" value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Schedule conflict, duplicate purchase, etc."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "refund-error" : undefined}
            />
          </label>
          {error && (
            <div id="refund-error" role="alert" className="mt-2 text-[12px] font-semibold text-hibiscus">
              {error}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Submitting…" : "Send request"}
            </button>
            <button type="button" onClick={close} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
