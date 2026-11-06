"use client";

/**
 * Location section for the event detail page.
 *
 * Layout (two columns on desktop, stacked on mobile):
 *   LEFT  — venue name + address + "How do you want to get there?" chips
 *           (Driving, Public transport, Biking, Walking) that open Google
 *           Maps directions in the correct travel mode.
 *   RIGHT — deferred Google Static Maps preview with a "Show map" button.
 *           We don't load the static map API key until the user asks for
 *           the map, to save network + protect the key from scraping.
 *
 * Falls back gracefully when venueAddress is missing (show name only).
 * Renders nothing at all for ONLINE events.
 */

import { useMemo, useState } from "react";

type Props = {
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  country: string | null;
  isOnline: boolean;
};

function mapsUrl(query: string, mode: "driving" | "transit" | "bicycling" | "walking") {
  const q = encodeURIComponent(query);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=${mode}`;
}

function staticMapEmbedUrl(query: string) {
  // OpenStreetMap embed — no API key needed. Good default; the
  // organizer can swap in Google Maps if they wire up a key later.
  const q = encodeURIComponent(query);
  return `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&search=${q}`;
}

const MODES = [
  {
    key: "driving" as const,
    label: "Driving",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5" />
        <path d="M3 12v5a1 1 0 001 1h2a1 1 0 001-1v-1M21 12v5a1 1 0 01-1 1h-2a1 1 0 01-1-1v-1" />
        <circle cx="7.5" cy="14.5" r="1.5" />
        <circle cx="16.5" cy="14.5" r="1.5" />
      </svg>
    )
  },
  {
    key: "transit" as const,
    label: "Public transport",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="4" width="14" height="13" rx="2" />
        <path d="M5 11h14M8 21l1-2M16 21l-1-2" />
        <circle cx="8.5" cy="14.5" r="0.8" fill="currentColor" />
        <circle cx="15.5" cy="14.5" r="0.8" fill="currentColor" />
      </svg>
    )
  },
  {
    key: "bicycling" as const,
    label: "Biking",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="5.5" cy="17" r="3.5" />
        <circle cx="18.5" cy="17" r="3.5" />
        <path d="M5.5 17l4-8h4l3 5M13 5h3" />
      </svg>
    )
  },
  {
    key: "walking" as const,
    label: "Walking",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="4" r="1.8" />
        <path d="M10 22l2-7 3 2 2 4M10 22l2-10-3-4-3 3v4" />
      </svg>
    )
  }
];

export default function LocationBlock({ venueName, venueAddress, city, country, isOnline }: Props) {
  const [showMap, setShowMap] = useState(false);

  const fullAddress = useMemo(
    () => [venueAddress, city, country].filter(Boolean).join(", "),
    [venueAddress, city, country]
  );
  const query = useMemo(
    () => [venueName, fullAddress].filter(Boolean).join(", "),
    [venueName, fullAddress]
  );

  if (isOnline) return null;
  if (!query) return null;

  return (
    <section>
      <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-nile-900 tracking-tight">
        Location
      </h2>

      <div className="mt-4 grid gap-6 md:grid-cols-[1fr,360px] items-start">
        {/* ─── Venue + transport modes ─── */}
        <div>
          {venueName && (
            <div className="font-semibold text-ink text-[17px]">{venueName}</div>
          )}
          {fullAddress && (
            <div className="mt-1 text-ink-600 text-[14px] leading-relaxed whitespace-pre-line">
              {venueAddress ? <>{venueAddress}<br /></> : null}
              {[city, country].filter(Boolean).join(", ")}
            </div>
          )}

          <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border-hairline)" }}>
            <div className="font-semibold text-ink-900">How do you want to get there?</div>
            <ul className="mt-3 space-y-2">
              {MODES.map((m) => (
                <li key={m.key}>
                  <a
                    href={mapsUrl(query, m.key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 text-nile hover:bg-nile-50 focus-visible:bg-nile-50"
                  >
                    {m.icon}
                    <span className="text-[15px] font-medium">{m.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ─── Map preview (deferred) ─── */}
        <div className="relative rounded-md overflow-hidden bg-nile-50 min-h-[220px] flex items-center justify-center shadow-sm">
          {showMap ? (
            <iframe
              title="Event location map"
              src={staticMapEmbedUrl(query)}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
            />
          ) : (
            <>
              {/* Stylized preview to show there's a map without loading an iframe */}
              <div aria-hidden className="absolute inset-0" style={{
                backgroundColor: "#C9D8F7",
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 46px, #9DB8EF 46px 48px)," +
                  "repeating-linear-gradient(90deg, transparent 0 46px, #9DB8EF 46px 48px)"
              }} />
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="btn btn-outline relative z-[1] shadow-sm"
              >
                Show map
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
