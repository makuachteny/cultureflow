"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Viewer = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
} | null;

type Props = {
  viewer: Viewer;
};

/**
 * MobileMenu — slide-in drawer for sub-md viewports. Replaces the desktop
 * nav links (Pricing, Find Events, Create Events, Find my tickets, Help)
 * which are otherwise unreachable below md.
 *
 * Behavior
 *   • Hamburger button shown only below md (the desktop header takes over
 *     at md+).
 *   • Drawer slides in from the right with a backdrop. Tap outside, the
 *     close button, Escape, or a nav link to dismiss.
 *   • Body scroll is locked while open so the page doesn't scroll under
 *     a touching finger.
 *   • All tap targets are ≥44 px to meet WCAG 2.2 minimum touch size.
 */
export default function MobileMenu({ viewer }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-900 hover:bg-ink-900/5 active:bg-ink-900/10 transition-colors -mr-1"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="md:hidden fixed inset-0 z-50"
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-ink-900/40 motion-safe:[animation:cf-fade-in_180ms_ease-out_both]"
          />

          <div className="absolute inset-y-0 right-0 w-[88vw] max-w-sm bg-cream-100 shadow-2xl flex flex-col motion-safe:[animation:cf-slide-in-right_220ms_cubic-bezier(0.22,1,0.36,1)_both]">
            <div className="flex items-center justify-between h-[60px] px-4 border-b border-[color:var(--border-hairline)] shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                Menu
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-900 hover:bg-ink-900/5 active:bg-ink-900/10 transition-colors -mr-2"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Primary">
              {viewer && (
                <Link
                  href={viewer.role === "ATTENDEE" ? "/account" : "/dashboard"}
                  onClick={close}
                  className="flex items-center gap-3 mx-2 mt-2 mb-3 px-3 py-3 rounded-xl bg-white ring-1 ring-ink-900/10 hover:ring-[color:var(--border-strong)] transition-colors"
                >
                  {viewer.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewer.image}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-full bg-nile text-white grid place-items-center text-[15px] font-bold shrink-0">
                      {(viewer.name?.[0] ?? viewer.email?.[0] ?? "T").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink-900 truncate">
                      {viewer.name ?? viewer.email ?? "Account"}
                    </div>
                    <div className="text-[12px] text-ink-500">
                      {viewer.role === "ATTENDEE" ? "View account" : "Open dashboard"}
                    </div>
                  </div>
                </Link>
              )}

              <MobileMenuGroup label="Discover">
                <MobileMenuItem href="/browse" onSelect={close} label="Find events" />
                <MobileMenuItem href="/events/new" onSelect={close} label="Create event" />
                <MobileMenuItem href="/pricing" onSelect={close} label="Pricing" />
                {viewer && (
                  <MobileMenuItem href="/tickets" onSelect={close} label="Find my tickets" />
                )}
              </MobileMenuGroup>

              <MobileMenuGroup label="Help">
                <MobileMenuItem href="/help" onSelect={close} label="Help center" />
                <MobileMenuItem href="/how-it-works" onSelect={close} label="How it works" />
                <MobileMenuItem href="/contact" onSelect={close} label="Contact us" />
              </MobileMenuGroup>
            </nav>

            <div className="shrink-0 border-t border-[color:var(--border-hairline)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white">
              {viewer ? (
                <Link
                  href="/events/new"
                  onClick={close}
                  className="inline-flex w-full items-center justify-center h-12 rounded-xl bg-nile-900 text-white text-[14px] font-semibold hover:bg-nile-800 transition-colors"
                >
                  Create event
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/sign-in"
                    onClick={close}
                    className="inline-flex items-center justify-center h-12 rounded-xl bg-white ring-1 ring-ink-900/15 text-ink-900 text-[14px] font-semibold hover:bg-cream-100 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={close}
                    className="inline-flex items-center justify-center h-12 rounded-xl bg-nile-900 text-white text-[14px] font-semibold hover:bg-nile-800 transition-colors"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileMenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-1">
      <div className="px-4 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </div>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function MobileMenuItem({
  href,
  label,
  onSelect
}: {
  href: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onSelect}
        className="flex items-center justify-between min-h-[48px] px-4 mx-1 rounded-lg text-[15px] font-semibold text-ink-900 hover:bg-white active:bg-white transition-colors"
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
