"use client";

import { useEffect, useRef, useState } from "react";
import EventFlyer from "@/components/event/EventFlyer";

/**
 * Share modal. Opens in an overlay with six targets:
 * copy-link, Facebook, Messenger, LinkedIn, X/Twitter, Email.
 *
 * Keyboard:
 *   • Escape closes
 *   • Focus returns to the opener on close (browser default behavior)
 *
 * Accessibility:
 *   • Backdrop has `role="presentation"` — clicks dismiss
 *   • Dialog itself has `role="dialog"` + `aria-modal="true"`
 *   • Focus-trap is intentionally minimal — the inline action list is
 *     short enough that keyboard users can tab out to close without
 *     getting stuck; we don't block tabindex.
 */
export default function ShareModal({
  open,
  onClose,
  title,
  url,
  flyer
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  /** Optional event data for the "Share a flyer" preview section.
   *  When omitted, the flyer block is hidden and the modal stays
   *  social-only (back-compat for callers that haven't been updated). */
  flyer?: {
    organizer: string;
    bannerUrl: string | null;
    dateLabel: string;
    venueLabel: string;
  };
}) {
  const [copied, setCopied] = useState(false);
  const [aspect, setAspect] = useState<"4:5" | "9:16">("4:5");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember whoever focus was on so we can return it on close.
    openerRef.current = document.activeElement;

    // Move focus into the dialog on open for keyboard + screen reader users.
    const focusInitial = () => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    };
    focusInitial();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Focus trap — keep Tab navigation inside the dialog.
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // Lock body scroll while open so the backdrop doesn't jitter behind.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Return focus to whatever opened the modal (Share button, typically).
      if (openerRef.current instanceof HTMLElement) {
        openerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const encoded   = encodeURIComponent(url);
  const encTitle  = encodeURIComponent(title);
  const shareText = encodeURIComponent(`${title} — ${url}`);

  // Messenger's web-share dialog needs a Facebook app id; without one
  // we fall back to the standard Facebook share composer, which still
  // delivers the correct URL and preview.
  const targets: Array<{
    key: string;
    label: string;
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    fill: string;
  }> = [
    {
      key: "copy",
      label: "Copy link",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch { /* ignore */ }
      },
      fill: "#0E1F4A",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 10-7.07-7.07l-1 1" />
          <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 107.07 7.07l1-1" />
        </svg>
      )
    },
    {
      key: "facebook",
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      fill: "#1877F2",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M22 12a10 10 0 10-11.56 9.88v-6.99h-2.5V12h2.5V9.8c0-2.47 1.47-3.84 3.72-3.84 1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.22 0-1.6.76-1.6 1.54V12h2.73l-.44 2.89h-2.29v6.99A10 10 0 0022 12z" />
        </svg>
      )
    },
    {
      key: "messenger",
      label: "Share on Messenger",
      // Web messenger deep-link; mobile intercepts it natively, desktop
      // falls back to the URL share dialog.
      href: `https://www.facebook.com/dialog/send?link=${encoded}&app_id=&redirect_uri=${encoded}`,
      fill: "#0084FF",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.9 1.45 5.5 3.72 7.18V22l3.4-1.87c.9.25 1.87.4 2.88.4 5.52 0 10-4.14 10-9.28S17.52 2 12 2zm1 12.5l-2.58-2.75L5.5 14.5l5.4-5.75L13.5 11.5 18.5 8.5 13 14.5z" />
        </svg>
      )
    },
    {
      key: "linkedin",
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      fill: "#0A66C2",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.62 0 4.28 2.38 4.28 5.48v6.26zM5.34 7.43a2.07 2.07 0 110-4.13 2.07 2.07 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.23 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.46c.97 0 1.77-.78 1.77-1.74V1.74C24 .78 23.2 0 22.23 0z" />
        </svg>
      )
    },
    {
      key: "twitter",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encTitle}`,
      fill: "#0F0F0F",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      )
    },
    {
      key: "email",
      label: "Share by email",
      href: `mailto:?subject=${encTitle}&body=${shareText}`,
      fill: "#575757",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      )
    }
  ];

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-nile-900/80 px-4 py-10"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[760px] max-h-[90vh] overflow-y-auto rounded-md bg-white shadow-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 id="share-modal-title" className="text-[17px] font-semibold text-nile-900">
            Share with friends
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-nile-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Social share row */}
        <div className="px-6 pb-6 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {targets.map((t) => {
              const button = (
                <div className="flex flex-col items-center gap-2 group">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-sm motion-safe:transition-transform motion-safe:duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card"
                    style={{ backgroundColor: t.fill }}
                  >
                    {t.icon}
                  </span>
                  <span className="text-[11px] font-semibold text-ink-700 group-hover:text-nile-900 motion-safe:transition-colors">
                    {t.key === "copy" && copied ? "Copied!" : (
                      t.key === "copy" ? "Copy link" :
                      t.key === "facebook" ? "Facebook" :
                      t.key === "messenger" ? "Messenger" :
                      t.key === "linkedin" ? "LinkedIn" :
                      t.key === "twitter" ? "X" :
                      "Email"
                    )}
                  </span>
                </div>
              );

              return t.onClick ? (
                <button
                  key={t.key}
                  type="button"
                  onClick={t.onClick}
                  aria-label={t.label}
                  className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30"
                >
                  {button}
                </button>
              ) : (
                <a
                  key={t.key}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.label}
                  className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nile/30"
                >
                  {button}
                </a>
              );
            })}
          </div>

          {/* URL preview row — copyable input for belt-and-suspenders */}
          <div className="mt-8 flex items-center gap-2 rounded-full bg-cream-100 pl-4 pr-1 py-1">
            <span className="flex-1 min-w-0 truncate text-[13px] text-ink-700 font-mono">
              {url}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                } catch { /* ignore */ }
              }}
              className="shrink-0 rounded-full bg-nile-900 text-white px-4 py-2 text-[13px] font-semibold hover:bg-nile-700 motion-safe:transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* ── Share a flyer ──
              Two ready-made poster previews of the event the user can
              screenshot or save. The aspect-ratio toggle switches both
              cards between feed-post (4:5) and story (9:16). */}
          {flyer && (
            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-nile-900">
                  Share a flyer
                </h3>

                {/* Aspect-ratio segmented control */}
                <div
                  role="group"
                  aria-label="Flyer aspect ratio"
                  className="inline-flex h-8 rounded-full border border-[color:var(--border-hairline)] bg-white overflow-hidden text-[12px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => setAspect("4:5")}
                    aria-pressed={aspect === "4:5"}
                    className={
                      "inline-flex items-center gap-1.5 px-3 motion-safe:transition-colors " +
                      (aspect === "4:5" ? "bg-nile text-white" : "text-ink-700 hover:bg-nile-50")
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="6" y="3" width="12" height="18" rx="1.5" />
                    </svg>
                    4:5
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspect("9:16")}
                    aria-pressed={aspect === "9:16"}
                    className={
                      "inline-flex items-center gap-1.5 px-3 border-l border-[color:var(--border-hairline)] motion-safe:transition-colors " +
                      (aspect === "9:16" ? "bg-nile text-white" : "text-ink-700 hover:bg-nile-50")
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="8" y="2" width="8" height="20" rx="1.5" />
                    </svg>
                    9:16
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <EventFlyer
                  variant="warm"
                  aspect={aspect}
                  title={title}
                  organizer={flyer.organizer}
                  bannerUrl={flyer.bannerUrl}
                  dateLabel={flyer.dateLabel}
                  venueLabel={flyer.venueLabel}
                  url={url}
                />
                <EventFlyer
                  variant="cool"
                  aspect={aspect}
                  title={title}
                  organizer={flyer.organizer}
                  bannerUrl={flyer.bannerUrl}
                  dateLabel={flyer.dateLabel}
                  venueLabel={flyer.venueLabel}
                  url={url}
                />
              </div>

              <p className="mt-3 text-[12px] text-ink-500">
                Right-click a flyer (long-press on mobile) to save it as an image, then drop it into your post.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
