"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";

/**
 * DashboardShell — the signed-in app chrome.
 *
 *   [ sidebar (resizable) │ content column (margin adjusts) ]
 *
 * The sidebar is resized by dragging a thin vertical handle on its
 * right edge. Width is clamped to [MIN, MAX] and persisted to
 * localStorage so the next visit honours the user's choice. Below
 * COLLAPSE_AT the sidebar switches to icon-only mode.
 */

const STORAGE_KEY  = "tribe.sidebar.width";
/* Default to icon-only mode. The sidebar is resizable in [MIN..MAX];
   anything below COLLAPSE_AT renders as the collapsed rail (icons
   only — the layout the screenshots show on first load). Returning
   visitors see whatever they last dragged it to via localStorage. */
const MIN_W        = 72;
const MAX_W        = 400;
const COLLAPSE_AT  = 144;
const DEFAULT_W    = MIN_W;
/* Below this viewport width we override the persisted width and force
   the sidebar back to its icon-only rail. A user who dragged the
   sidebar to 320 px on desktop shouldn't hit the same value on a 360-px
   phone — the page would have nowhere to go. */
const MOBILE_BREAKPOINT = 768;
const MOBILE_W          = MIN_W;

type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";
type Props = {
  children: React.ReactNode;
  /** Viewer's role — controls which sidebar groups render. Attendees
   *  don't see the Organize group (Events / Orders / Marketing /
   *  Reports / Finance); those surfaces are organizer concerns. */
  role?: Role;
};

export default function DashboardShell({ children, role }: Props) {
  const [width, setWidth]     = useState<number>(DEFAULT_W);
  const [resizing, setResizing] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Keep a ref for the mousemove handler so it doesn't close over a
  // stale `width` between renders.
  const widthRef = useRef<number>(DEFAULT_W);
  widthRef.current = width;

  // Track viewport width so we can override the persisted desktop width
  // on mobile. The sidebar is the same component across breakpoints —
  // we just clamp the rail to MOBILE_W and force icon-only mode below
  // the breakpoint so a user who dragged the sidebar to 320 px on
  // desktop doesn't get a 320-px rail on a 360-px phone.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Load persisted width once on mount. We don't block the initial
     SSR render on this — the server paints with DEFAULT_W, and if
     the user previously resized we reconcile a frame later. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(n)) setWidth(clamp(n));
    } catch { /* localStorage disabled */ }
    setHydrated(true);
  }, []);

  /* Persist on change (but only after hydration so we don't clobber
     a stored value with the SSR default). */
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, String(width)); }
    catch { /* ignore */ }
  }, [width, hydrated]);

  /* ───────── Drag lifecycle ───────── */

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);

    const onMove = (ev: PointerEvent) => {
      setWidth(clamp(ev.clientX));
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, []);

  /* Keyboard resize for a11y — left/right arrows on the handle
     nudge the width by 16px, shift+arrow by 64px. */
  const onHandleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.shiftKey ? 64 : 16;
    const delta = e.key === "ArrowLeft" ? -step : step;
    setWidth((w) => clamp(w + delta));
  }, []);

  // Effective rail width: persisted JS state on desktop, clamped to
  // MOBILE_W below the breakpoint. Pre-hydration we use the JS state
  // so the SSR markup matches the client's first paint at desktop
  // viewports (the most common case). After mount, matchMedia kicks in
  // and shrinks the rail on phones.
  const effectiveWidth = isMobile ? MOBILE_W : width;
  const expanded = !isMobile && width >= COLLAPSE_AT;

  return (
    <div className="min-h-screen bg-parchment">
      <Sidebar
        width={effectiveWidth}
        expanded={expanded}
        resizing={resizing}
        role={role}
        onHandlePointerDown={onPointerDown}
        onHandleKeyDown={onHandleKey}
        showResizeHandle={!isMobile}
      />
      <div
        className={"ticket-printable-root " + (resizing ? "" : "transition-[margin] duration-150 ease-out")}
        style={{ marginLeft: `${effectiveWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_W;
  return Math.max(MIN_W, Math.min(MAX_W, Math.round(n)));
}
