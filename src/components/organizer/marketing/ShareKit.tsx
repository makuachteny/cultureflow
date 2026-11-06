"use client";

import { useState } from "react";

/**
 * Social share kit — organizer picks one of their upcoming events and
 * gets pre-filled copy + one-click deep links to X, Facebook, LinkedIn,
 * WhatsApp, Telegram, and email. Everything is derived client-side from
 * the event metadata the server passed down — no network round-trips.
 */

export type ShareEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  startsAt: string;   // ISO
  city: string | null;
  country: string | null;
  venueName: string | null;
};

export default function ShareKit({
  events,
  origin,
  tagline
}: {
  events: ShareEvent[];
  origin: string;
  tagline: string;
}) {
  const [sel, setSel] = useState<string>(events[0]?.id ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const active = events.find((e) => e.id === sel) ?? events[0];

  const url = active ? `${origin}/events/${active.slug}` : "";
  const when = active ? new Date(active.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const where = active ? [active.city, active.country].filter(Boolean).join(", ") : "";

  const shortCopy = active
    ? `${active.title} — ${when}${where ? " · " + where : ""}. ${tagline}`
    : "";
  const longCopy = active
    ? `${active.title}\n${when}${where ? " · " + where : ""}\n\n${active.summary ?? ""}\n\n${tagline}\n${url}`
    : "";

  const encoded = encodeURIComponent;
  const shareLinks = active
    ? {
        x:        `https://twitter.com/intent/tweet?text=${encoded(shortCopy)}&url=${encoded(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded(url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded(url)}`,
        whatsapp: `https://wa.me/?text=${encoded(shortCopy + " " + url)}`,
        telegram: `https://t.me/share/url?url=${encoded(url)}&text=${encoded(shortCopy)}`,
        email:    `mailto:?subject=${encoded(active.title)}&body=${encoded(longCopy)}`
      }
    : null;

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1800);
    } catch {
      setCopied(null);
    }
  }

  if (!active) {
    return (
      <div className="card p-10 text-center">
        <h3 className="font-display text-xl font-bold text-nile">No events to share yet</h3>
        <p className="mt-2 text-sm text-ink-600 max-w-md mx-auto">
          Publish an event and its share kit will appear here with pre-filled copy for every channel.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <div>
        <label className="block">
          <span className="text-sm font-semibold text-ink mb-1 block">Pick an event</span>
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="input"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </label>

        <div className="card mt-5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Event link</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-nile-50 px-2 py-1.5 text-[12px] text-nile font-tabular">{url}</code>
            <button
              type="button"
              onClick={() => copy("url", url)}
              className="btn btn-ghost btn-sm"
            >
              {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <CopyBlock
          title="Short (X / Threads)"
          text={shortCopy}
          active={copied === "short"}
          onCopy={() => copy("short", shortCopy)}
        />
        <CopyBlock
          title="Long (LinkedIn / Email)"
          text={longCopy}
          active={copied === "long"}
          onCopy={() => copy("long", longCopy)}
          multiline
        />

        <div>
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Share directly</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <ShareBtn href={shareLinks!.x}        label="Share on X"         />
            <ShareBtn href={shareLinks!.facebook} label="Share on Facebook"  />
            <ShareBtn href={shareLinks!.linkedin} label="Share on LinkedIn"  />
            <ShareBtn href={shareLinks!.whatsapp} label="Share on WhatsApp"  />
            <ShareBtn href={shareLinks!.telegram} label="Share on Telegram"  />
            <ShareBtn href={shareLinks!.email}    label="Share via email"    />
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyBlock({
  title, text, onCopy, active, multiline
}: {
  title: string; text: string; onCopy: () => void; active: boolean; multiline?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{title}</div>
        <button type="button" onClick={onCopy} className="btn btn-ghost btn-sm">
          {active ? "Copied" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <pre className="mt-3 whitespace-pre-wrap break-words rounded bg-cream-100 p-3 text-[13px] text-ink-800 leading-relaxed">
          {text}
        </pre>
      ) : (
        <p className="mt-3 rounded bg-cream-100 p-3 text-[13px] text-ink-800 leading-relaxed break-words">
          {text}
        </p>
      )}
    </div>
  );
}

function ShareBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-outline btn-sm justify-center"
    >
      {label}
    </a>
  );
}
