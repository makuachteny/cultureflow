"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * EventCardActions — three small floating action buttons that appear on
 * hover at the top-right of an EventCard's image:
 *
 *   ♡   Like / Save           → toggles via /api/likes (cookie-auth'd)
 *   ⤴   Share                  → copies the event URL to the clipboard
 *   ⋯   More                   → menu with "Hide this event" + "Report"
 *
 * Hover affordance
 *   The button cluster fades in via `opacity-0 group-hover:opacity-100`
 *   on `sm:+`. On touch viewports (md: and below) they stay visible at
 *   reduced opacity so taps still work without a hover state.
 *
 * Click handling
 *   Every button calls `e.preventDefault() + e.stopPropagation()` so
 *   the surrounding `<Link>` wrapping the card never navigates to the
 *   event detail page on click.
 */
export default function EventCardActions({
  eventId,
  eventSlug,
  eventTitle,
  initialLiked
}: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  initialLiked?: boolean;
}) {
  const [liked, setLiked]       = useState(Boolean(initialLiked));
  const [busy, setBusy]         = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden]     = useState(false);
  const [shared, setShared]     = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* Honour a previously-stored "hidden" choice from localStorage so the
   * card stays hidden across reloads. Wrapped in a try/catch because
   * `localStorage` access throws in privacy modes. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cf:hidden-events");
      if (!raw) return;
      const ids: string[] = JSON.parse(raw);
      if (Array.isArray(ids) && ids.includes(eventId)) setHidden(true);
    } catch { /* ignore */ }
  }, [eventId]);

  /* Outside-click + Escape close the more-menu. */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function toggleLike(e: React.MouseEvent) {
    stop(e);
    if (busy) return;
    const next = !liked;
    setLiked(next);          // optimistic
    setBusy(true);
    try {
      const res = await fetch("/api/likes", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ eventId, action: next ? "like" : "unlike" })
      });
      if (res.status === 401) {
        const here = window.location.pathname + window.location.search;
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(here)}`);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setLiked(!next);       // roll back
    } finally {
      setBusy(false);
    }
  }

  async function shareEvent(e: React.MouseEvent) {
    stop(e);
    const url = `${window.location.origin}/events/${eventSlug}`;
    // Native share sheet (mobile, modern desktop browsers) when available.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: eventTitle, url });
        return;
      } catch { /* user cancelled — fall through to clipboard copy */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch { /* clipboard blocked — silently no-op */ }
  }

  function hideEvent(e: React.MouseEvent) {
    stop(e);
    setMenuOpen(false);
    try {
      const raw = window.localStorage.getItem("cf:hidden-events");
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(eventId)) ids.push(eventId);
      window.localStorage.setItem("cf:hidden-events", JSON.stringify(ids));
    } catch { /* ignore */ }
    setHidden(true);
  }

  function reportEvent(e: React.MouseEvent) {
    stop(e);
    setMenuOpen(false);
    /* Route to the public contact form with the Trust & safety topic
     * pre-selected. The team handles event reports through that channel
     * already (see TOPICS["TRUST"] in /contact). */
    router.push(`/contact?topic=TRUST`);
  }

  /* When the user has hidden the event, render an undo affordance in
   * place of the action cluster — gives them a way back without
   * reloading the page. */
  if (hidden) {
    return (
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          try {
            const raw = window.localStorage.getItem("cf:hidden-events");
            const ids: string[] = raw ? JSON.parse(raw) : [];
            const next = ids.filter((id) => id !== eventId);
            window.localStorage.setItem("cf:hidden-events", JSON.stringify(next));
          } catch { /* ignore */ }
          setHidden(false);
        }}
        className={
          "absolute inset-0 z-[2] flex items-center justify-center rounded-xl " +
          "bg-ink-900/80 text-white text-[12.5px] font-semibold " +
          "motion-safe:transition-opacity motion-safe:duration-200"
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Hidden — undo
        </span>
      </button>
    );
  }

  return (
    <div
      className={
        "absolute top-2 right-2 z-[2] flex items-center gap-1.5 " +
        // Visibility split by pointer capability:
        //   • Hover-capable devices (`@media (hover: hover)` — desktops,
        //     laptops with mice/trackpads): hidden at rest, fade in on
        //     `group-hover` and `group-focus-within`.
        //   • Touch devices (`@media (hover: none)` — phones, tablets):
        //     always visible at full opacity, since there is no hover
        //     state to reveal them. Without this the buttons would be
        //     unreachable on mobile.
        "opacity-100 [@media(hover:hover)]:opacity-0 " +
        "motion-safe:transition-opacity motion-safe:duration-200 " +
        "group-hover:opacity-100 group-focus-within:opacity-100"
      }
    >
      {/* Like / save */}
      <ActionButton
        onClick={toggleLike}
        aria-label={liked ? "Unlike" : "Save"}
        aria-pressed={liked}
        active={liked}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
        </svg>
      </ActionButton>

      {/* Share */}
      <ActionButton
        onClick={shareEvent}
        aria-label={shared ? "Link copied" : "Share event"}
      >
        {shared ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-acacia-700" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16V4M8 8l4-4 4 4" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        )}
      </ActionButton>

      {/* More menu */}
      <div ref={menuRef} className="relative">
        <ActionButton
          onClick={(e) => {
            stop(e);
            setMenuOpen((o) => !o);
          }}
          aria-label="More options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          active={menuOpen}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <circle cx="6" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="18" cy="12" r="1.6" />
          </svg>
        </ActionButton>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1.5 w-[200px] rounded-md border border-[color:var(--border-hairline)] bg-white shadow-card p-1 z-10"
            onClick={stop}
          >
            <MenuItem onClick={hideEvent} icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10 10 0 0 1 22 12a10 10 0 0 1-3.5 5.4M6.3 6.3A10.5 10.5 0 0 0 2 12c1.7 4 5.6 7 10 7 1.6 0 3.1-.4 4.5-1" />
                <path d="M9.5 9.5A3 3 0 1 0 13.5 13.5" />
              </svg>
            }>
              Hide this event
            </MenuItem>
            <MenuItem onClick={reportEvent} icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 21V5l8-2 8 2v9l-8 2-8-2" />
                <path d="M12 3v18" />
              </svg>
            }>
              Report this event
            </MenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  children, active, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm " +
        "ring-1 ring-black/5 transition-colors " +
        (active
          ? "text-hibiscus"
          : "text-ink-800 hover:text-nile")
      }
    >
      {children}
    </button>
  );
}

function MenuItem({
  children, icon, onClick
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-ink-800 hover:bg-nile-50/70 focus-visible:bg-nile-50/70 transition-colors"
    >
      <span className="text-ink-500 shrink-0">{icon}</span>
      <span>{children}</span>
    </button>
  );
}
