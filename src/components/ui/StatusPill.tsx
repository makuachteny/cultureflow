/**
 * Status badge. Accepts any of the status strings we use across Orders,
 * Payments, RefundRequests, Tickets — and anything unknown falls back
 * to a neutral tone. All callers render the same shade for the same
 * status so the UI reads consistently across Finance, Orders, and Events.
 */

const TONE: Record<string, string> = {
  // Success / approval
  PAID:       "bg-acacia-50 text-acacia-600",
  SUCCEEDED:  "bg-acacia-50 text-acacia-600",
  APPROVED:   "bg-acacia-50 text-acacia-600",
  CHECKED_IN: "bg-acacia-50 text-acacia-600",

  // In-flight
  PENDING:         "bg-gold-50 text-gold-700",
  PROCESSING:      "bg-gold-50 text-gold-700",
  REQUIRES_ACTION: "bg-gold-50 text-gold-700",
  ISSUED:          "bg-nile-50 text-nile",

  // Reversed / cleared
  REFUNDED:  "bg-nile-50 text-nile-700",
  CANCELLED: "bg-nile-50 text-nile",

  // Failure
  FAILED:   "bg-hibiscus/10 text-hibiscus",
  REJECTED: "bg-hibiscus/10 text-hibiscus"
};

export default function StatusPill({ status }: { status: string }) {
  const label = status.toUpperCase();
  const tone = TONE[label] ?? "bg-cream-200 text-ink-700";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}
