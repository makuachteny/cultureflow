/**
 * "Good to know" — two-card strip beneath the event description.
 * Card 1: Highlights (event format, duration, capacity, organizer-authored bullets).
 * Card 2: Refund policy.
 *
 * All icons pulled from the shared duotone set so the detail page
 * matches the cards + browse-by-category rail. Borderless surfaces
 * (shadow only) — consistent with the rest of the event view.
 */

import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";

type Props = {
  type: "IN_PERSON" | "ONLINE" | "HYBRID";
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  highlights?: string[];
  refundPolicy?: string | null;
};

function durationLabel(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  const h = ms / 36e5;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${h % 1 === 0 ? h : h.toFixed(1)} hours`;
  const days = Math.round(h / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function typeLabel(t: Props["type"]) {
  return t === "ONLINE" ? "Online event" : t === "HYBRID" ? "Hybrid" : "In person";
}

function typeIcon(t: Props["type"]): IconName {
  return t === "ONLINE" ? "compass" : "pin";
}

function Row({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[14px] text-ink-800">
      <span className="shrink-0 text-nile-700">
        <Icon name={icon} size={16} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function GoodToKnow({
  type, startsAt, endsAt, capacity, highlights = [], refundPolicy
}: Props) {
  return (
    <section>
      <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-nile-900 tracking-tight">
        Good to know
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Highlights — transparent background (matches page), rests on
            whitespace alone so the content reads as a continuous block. */}
        <div className="rounded-md p-5 bg-[color:var(--color-bg)]">
          <h3 className="font-semibold text-ink-900">Highlights</h3>
          <ul className="mt-3 space-y-2">
            <Row icon={typeIcon(type)}>{typeLabel(type)}</Row>
            <Row icon="clock">{durationLabel(startsAt, endsAt)}</Row>
            {capacity ? (
              <Row icon="users">Up to {capacity.toLocaleString()} attendees</Row>
            ) : null}
            {highlights.slice(0, 5).map((h) => (
              <Row key={h} icon="check">{h}</Row>
            ))}
          </ul>
        </div>

        {/* Refund policy — same transparent treatment */}
        <div className="rounded-md p-5 bg-[color:var(--color-bg)]">
          <h3 className="font-semibold text-ink-900 flex items-center gap-2">
            <span className="text-nile-700"><Icon name="shield-check" size={16} /></span>
            Refund policy
          </h3>
          <p className="mt-3 text-[14px] text-ink-700 leading-relaxed whitespace-pre-line">
            {refundPolicy?.trim() || "No refunds. Contact the organizer for any concerns about your ticket."}
          </p>
        </div>
      </div>
    </section>
  );
}
