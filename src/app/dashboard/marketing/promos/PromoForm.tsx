"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field from "@/components/ui/Field";

type Event = { id: string; title: string };

export default function PromoForm({
  events,
  /** Pre-populated values when editing an existing code. */
  initial,
  promoCodeId
}: {
  events:     Event[];
  initial?:   {
    code:          string;
    description?:  string;
    discountType:  "PERCENT" | "FIXED_CENTS";
    discountValue: number;
    eventId?:      string | null;
    startsAt?:     string;
    endsAt?:       string;
    maxUses?:      number;
    maxPerUser?:   number;
    active:        boolean;
  };
  promoCodeId?: string;
}) {
  const router = useRouter();
  const isEdit = !!promoCodeId;
  const [code,         setCode]         = useState(initial?.code ?? "");
  const [description,  setDescription]  = useState(initial?.description ?? "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED_CENTS">(
    initial?.discountType ?? "PERCENT"
  );
  const [discountValue, setDiscountValue] = useState(initial?.discountValue?.toString() ?? "10");
  const [eventId,      setEventId]      = useState(initial?.eventId ?? "");
  const [startsAt,     setStartsAt]     = useState(initial?.startsAt ?? "");
  const [endsAt,       setEndsAt]       = useState(initial?.endsAt ?? "");
  const [maxUses,      setMaxUses]      = useState(initial?.maxUses?.toString() ?? "");
  const [maxPerUser,   setMaxPerUser]   = useState(initial?.maxPerUser?.toString() ?? "");
  const [active,       setActive]       = useState(initial?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);

    const payload: Record<string, unknown> = {
      code,
      description:   description.trim() || undefined,
      discountType,
      discountValue: discountType === "PERCENT"
        ? Number(discountValue)
        : Math.round(Number(discountValue) * 100), // major → minor units
      eventId:    eventId || undefined,
      startsAt:   startsAt || undefined,
      endsAt:     endsAt   || undefined,
      maxUses:    maxUses    ? Number(maxUses)    : undefined,
      maxPerUser: maxPerUser ? Number(maxPerUser) : undefined,
      active
    };
    if (isEdit) payload.id = promoCodeId;

    const res = await fetch("/api/promo-codes", {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Could not save the code.");
      return;
    }
    router.push("/dashboard/marketing?tab=promos&saved=1");
    router.refresh();
  }

  async function onDelete() {
    if (!promoCodeId) return;
    if (!confirm("Delete this promo code? Existing redemptions stay on the orders that used it.")) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/promo-codes", {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify({ id: promoCodeId, delete: true })
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Could not delete.");
      return;
    }
    router.push("/dashboard/marketing?tab=promos");
    router.refresh();
  }

  const isPercent = discountType === "PERCENT";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-[color:var(--border-hairline)] space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Code" hint="Buyers will type this. We uppercase + dedupe.">
          <input
            className="input font-tabular tracking-wider uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
            placeholder="DIASPORA10"
            required
            maxLength={40}
          />
        </Field>
        <Field label="Active">
          <label className="flex items-center gap-2 h-12">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 rounded border-ink-300 text-nile focus:ring-nile/40"
            />
            <span className="text-[14px] text-ink-700">
              {active ? "Buyers can redeem now" : "Hidden from checkout"}
            </span>
          </label>
        </Field>
      </div>

      <Field label="Description (optional)" hint="Internal note. Buyers don't see it.">
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Diaspora group launch promo"
          maxLength={160}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <Field label="Discount type">
          <select
            className="input"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED_CENTS")}
          >
            <option value="PERCENT">Percentage</option>
            <option value="FIXED_CENTS">Fixed amount</option>
          </select>
        </Field>
        <Field
          label={isPercent ? "Percent off" : "Amount off (in the order's currency)"}
          hint={isPercent ? "1–100" : "Major units, e.g. 5.00"}
        >
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="number"
              min={isPercent ? 1 : 0.01}
              max={isPercent ? 100 : undefined}
              step={isPercent ? 1 : 0.01}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
            />
            <span className="text-[14px] font-semibold text-ink-600 w-6">
              {isPercent ? "%" : ""}
            </span>
          </div>
        </Field>
      </div>

      <Field label="Scope (optional)" hint="Leave blank to allow on any event you host.">
        <select
          className="input"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <option value="">All my events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts at (optional)">
          <input
            type="datetime-local"
            className="input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Ends at (optional)">
          <input
            type="datetime-local"
            className="input"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Max total uses (optional)">
          <input
            type="number" min={1} className="input"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited"
          />
        </Field>
        <Field label="Max uses per buyer (optional)">
          <input
            type="number" min={1} className="input"
            value={maxPerUser}
            onChange={(e) => setMaxPerUser(e.target.value)}
            placeholder="Unlimited"
          />
        </Field>
      </div>

      {err && (
        <div role="alert" className="text-[13px] font-semibold text-hibiscus">
          {err}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create promo code"}
        </button>
        {isEdit && (
          <button type="button" disabled={busy} onClick={onDelete}
            className="text-[13px] font-semibold text-hibiscus hover:underline">
            Delete code
          </button>
        )}
      </div>
    </form>
  );
}
