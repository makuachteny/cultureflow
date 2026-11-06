"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * EventFlyer — shareable poster card for an event.
 *
 * Two colour variants ("warm" gold-coral, "cool" cream-acacia) and two
 * aspect ratios (4:5 portrait for feed posts, 9:16 for stories/reels)
 * cover the common social formats. Each card composes the event banner
 * over a tinted footer panel that carries the organizer name, event
 * title, QR code, start date, and venue.
 *
 * Rendered live in `ShareModal` so the user sees a preview of what
 * they'd be sharing. The QR code is generated client-side via the
 * `qrcode` package — same dependency the ticket detail page already
 * uses, no new install.
 */
type Variant = "warm" | "cool";
type Aspect  = "4:5" | "9:16";

type Props = {
  variant: Variant;
  aspect: Aspect;
  title: string;
  organizer: string;
  bannerUrl?: string | null;
  dateLabel: string;     // e.g. "Jun 15 · 9:30 AM"
  venueLabel: string;    // e.g. "Hilton, Boston"
  url: string;           // event URL — encoded into the QR
};

const PALETTES: Record<Variant, { panelBg: string; panelText: string; titleText: string; corner: string }> = {
  // Warm: gold-into-coral panel — sunrise tone for poster shareables.
  // Title sits in deep ink over the warm wash.
  warm: {
    panelBg:    "#FCDD09",
    panelText:  "#000000",
    titleText:  "#000000",
    corner:     "#000000"
  },
  // Cool: cream-into-acacia panel that mirrors the second reference.
  cool: {
    panelBg:    "#078930",
    panelText:  "#FFFFFF",
    titleText:  "#FFFFFF",
    corner:     "#FCDD09"
  }
};

const ASPECT_CLASS: Record<Aspect, string> = {
  "4:5":  "aspect-[4/5]",
  "9:16": "aspect-[9/16]"
};

export default function EventFlyer({
  variant, aspect,
  title, organizer, bannerUrl, dateLabel, venueLabel, url
}: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const palette = PALETTES[variant];

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [url]);

  return (
    <figure
      className={
        "relative w-full overflow-hidden rounded-md shadow-lift " + ASPECT_CLASS[aspect]
      }
    >
      {/* Banner — fills the top half. Falls back to the placeholder
          gradient when the event doesn't have a banner image yet. */}
      <div className="absolute inset-0">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="bg-event-placeholder h-full w-full" />
        )}
      </div>

      {/* Color panel — tinted footer that carries the organizer + title +
          QR + date/venue. Half-height for 4:5, ~55% height for 9:16. */}
      <div
        className={
          "absolute inset-x-0 bottom-0 px-5 pt-5 pb-6 flex flex-col gap-3 " +
          (aspect === "4:5" ? "h-[52%]" : "h-[58%]")
        }
        style={{ background: palette.panelBg, color: palette.panelText }}
      >
        <div className="text-[11px] font-semibold opacity-90">
          By <span className="font-bold">{organizer}</span>
        </div>

        <h3
          className="font-display text-[22px] sm:text-[26px] font-extrabold leading-[1.05] uppercase tracking-tight"
          style={{ color: palette.titleText }}
        >
          {title}
        </h3>

        <div className="mt-auto flex items-end gap-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt=""
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-white p-1"
            />
          ) : (
            <span className="h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-white" aria-hidden />
          )}
          <div className="min-w-0 text-[11px] sm:text-[12px] leading-snug">
            <div className="font-bold">{dateLabel}</div>
            <div className="opacity-90 truncate">{venueLabel}</div>
          </div>
        </div>

        {/* Brand mark — small dark glyph in the bottom-right corner so
            the flyer feels stamped, not generic. */}
        <span
          aria-hidden
          className="absolute bottom-3 right-4 text-[16px] font-extrabold tracking-tight"
          style={{ color: palette.corner }}
        >
          ✦
        </span>
      </div>
    </figure>
  );
}
