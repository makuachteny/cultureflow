"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * HelpMenu — "Help Center ▾" dropdown in the header. Click opens a card
 * with a few categorized destinations; closes on outside click and Escape.
 */
const ITEMS: Array<{ href: string; label: string; blurb: string; icon: React.ReactNode }> = [
  {
    href: "/help",  label: "Help center",
    blurb: "Articles, troubleshooting, refunds.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4M12 17h.01" />
      </svg>
    )
  },
  {
    href: "/contact", label: "Contact us",
    blurb: "Talk to a human — we reply fast.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h18v14H3z" /><path d="M3 7l9 6 9-6" />
      </svg>
    )
  },
  {
    href: "/how-it-works", label: "How it works",
    blurb: "The five-minute overview.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" />
      </svg>
    )
  },
  {
    href: "/pricing", label: "Pricing",
    blurb: "Fees, payouts, mobile money.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M7 7h7a3 3 0 010 6H7l10 10" />
      </svg>
    )
  }
];

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-700 hover:text-nile transition-colors px-2 h-8 whitespace-nowrap"
      >
        Help Center
        <svg viewBox="0 0 24 24" className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Help Center"
          className="absolute right-0 z-40 mt-2 w-[280px] rounded-md border border-[color:var(--border-hairline)] bg-white shadow-card p-1.5"
        >
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-nile-50/70 focus-visible:bg-nile-50/70 transition-colors"
            >
              <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nile-50 text-nile">
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-900">{it.label}</span>
                <span className="block text-[11px] text-ink-500 truncate">{it.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
