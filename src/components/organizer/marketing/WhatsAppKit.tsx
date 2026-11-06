"use client";

import { useState } from "react";
import type { ShareEvent } from "./ShareKit";

/**
 * WhatsApp group promo builder. Organizers post into dozens of community
 * WhatsApp groups — the winning pattern is one tight paste-ready message
 * with emoji bullets, not a link preview. This component builds it.
 */

export default function WhatsAppKit({
  events,
  origin,
  tagline
}: {
  events: ShareEvent[];
  origin: string;
  tagline: string;
}) {
  const [sel, setSel] = useState<string>(events[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const active = events.find((e) => e.id === sel) ?? events[0];

  if (!active) {
    return (
      <div className="card p-10 text-center">
        <h3 className="font-display text-xl font-bold text-nile">No events to promote yet</h3>
        <p className="mt-2 text-sm text-ink-600 max-w-md mx-auto">
          Publish an event and its WhatsApp-ready promo block will appear here.
        </p>
      </div>
    );
  }

  const url   = `${origin}/events/${active.slug}`;
  const when  = new Date(active.startsAt).toLocaleString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
  const where = [active.venueName, active.city, active.country].filter(Boolean).join(", ") || "Location TBA";

  const block =
`*${active.title}*

📅 ${when}
📍 ${where}

${active.summary ?? tagline}

🎟️ Get your ticket: ${url}

${tagline}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(block);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(block)}`;

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <div>
        <label className="block">
          <span className="text-sm font-semibold text-ink mb-1 block">Pick an event</span>
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="input">
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </label>

        <ul className="mt-5 space-y-2 text-[13px] text-ink-600">
          <li className="flex items-start gap-2">
            <span aria-hidden>📋</span>
            <span>Copy the block and paste it directly into your WhatsApp groups.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden>📲</span>
            <span>Or tap <em>Open WhatsApp</em> to share from your phone.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden>💡</span>
            <span>Tip: post in the evening — groups get the most engagement between 7–10pm local.</span>
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Promo block</div>
            <button type="button" onClick={copy} className="btn btn-ghost btn-sm">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded bg-[#E7F6E8] p-4 text-[14px] text-ink-900 leading-relaxed">
            {block}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Open WhatsApp
          </a>
          <button type="button" onClick={copy} className="btn btn-ghost">
            {copied ? "Block copied ✓" : "Copy block"}
          </button>
        </div>
      </div>
    </div>
  );
}
