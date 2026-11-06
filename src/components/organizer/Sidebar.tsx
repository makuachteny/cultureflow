"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   Dashboard sidebar — resizable rail.

   Owned by DashboardShell, which passes in `width` and the pointer
   handlers for the drag handle. When `width < COLLAPSE_AT`, the
   parent passes `expanded=false`; this file just trusts that flag
   and renders either the icon-only rail or the icons + labels layout.

   Three groups separated by hairlines:
     1. Organize — Home, Events, Orders, Marketing, Reports, Finance
     2. Discover — Browse, Tickets, Liked, Following, Interests
     3. Bottom   — Account, Help

   Sign out is on the TopBar next to the avatar, not here. Org-level
   settings live under /account/organization (see AccountSidebar) —
   keeping them out of the dashboard rail makes the distinction clearer:
   Dashboard is for running events, Account is for running the
   organization.
   ───────────────────────────────────────────────────────────── */

type Item = { href: string; label: string; icon: ReactNode };

const ORG_NAV: Item[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V11z" />
  },
  {
    href: "/dashboard/events",
    label: "Events",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    )
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: (
      <>
        <path d="M3 7l9-4 9 4" />
        <path d="M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7" />
        <path d="M9 11h6" />
      </>
    )
  },
  {
    href: "/dashboard/marketing",
    label: "Marketing",
    icon: (
      <>
        <path d="M3 10v4a2 2 0 002 2h3l5 4V4L8 8H5a2 2 0 00-2 2z" />
        <path d="M17 8a5 5 0 010 8" />
      </>
    )
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-7" />
      </>
    )
  },
  {
    href: "/dashboard/finance",
    label: "Finance",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M3 11h18" />
        <circle cx="12" cy="15" r="1.6" />
      </>
    )
  }
];

const ATTENDEE_NAV: Item[] = [
  {
    href: "/browse",
    label: "Browse events",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </>
    )
  },
  {
    href: "/tickets",
    label: "Tickets",
    icon: (
      <>
        <path d="M4 9a2 2 0 002 2h.01a2 2 0 010 4H6a2 2 0 00-2 2v1a2 2 0 002 2h12a2 2 0 002-2v-1a2 2 0 00-2-2h-.01a2 2 0 010-4H18a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v1z" />
      </>
    )
  },
  {
    href: "/liked",
    label: "Liked",
    icon: (
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    )
  },
  {
    href: "/following",
    label: "Following",
    icon: (
      <>
        <circle cx="9" cy="8" r="4" />
        <circle cx="17" cy="10" r="3" />
        <path d="M2 21a7 7 0 0114 0M14 17a5 5 0 018 0" />
      </>
    )
  },
  {
    href: "/interests",
    label: "Interests",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </>
    )
  }
];

const BOTTOM: Item[] = [
  {
    href: "/account",
    label: "Account",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </>
    )
  },
  {
    href: "/help",
    label: "Help",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h0" />
      </>
    )
  }
];

// Admin-only nav. Rendered as a separate group between Organize/Discover
// and the bottom row so the elevated capability is visually distinct.
const ADMIN_NAV: Item[] = [
  {
    href: "/admin",
    label: "Admin",
    icon: (
      <>
        <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </>
    )
  }
];

type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";

type Props = {
  width: number;
  expanded: boolean;
  resizing: boolean;
  role?: Role;
  onHandlePointerDown: (e: React.PointerEvent) => void;
  onHandleKeyDown: (e: React.KeyboardEvent) => void;
  /** Hide the drag-to-resize handle on touch viewports — the gesture
   *  isn't useful on phones and the handle's hit zone steals horizontal
   *  scroll on the rail. */
  showResizeHandle?: boolean;
};

export default function Sidebar({
  width, expanded, resizing, role, onHandlePointerDown, onHandleKeyDown,
  showResizeHandle = true
}: Props) {
  const canOrganize = role === "ORGANIZER" || role === "ADMIN";
  const isAdmin     = role === "ADMIN";
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      aria-label="Dashboard navigation"
      style={{ width }}
      className={
        "no-print fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[color:var(--border-hairline)] bg-white overflow-hidden " +
        (resizing ? "" : "transition-[width] duration-150 ease-out")
      }
    >
      {/* Brand row — no bottom hairline. Earlier versions split the
          sidebar into two stacked columns with a 1px rule across the
          top, which created a stray horizontal line that visually
          ran into the page hero card on the right. Without the rule
          the sidebar reads as one continuous column and the brand
          floats cleanly above the nav. */}
      <div className="flex h-[72px] shrink-0 items-center">
        <Link
          href="/dashboard"
          className="flex h-full flex-1 items-center gap-3 px-5 min-w-0"
          aria-label="Go to dashboard home"
        >
          {expanded
            ? <Logo variant="horizontal" size={32} href={null} />
            : <Logo variant="mark"       size={32} href={null} />
          }
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-stretch gap-1 overflow-y-auto px-3 py-4">
        {canOrganize && (
          <>
            <GroupLabel expanded={expanded}>Organize</GroupLabel>
            {ORG_NAV.map((item) => (
              <Row key={item.href} item={item} active={isActive(item.href)} expanded={expanded} />
            ))}
          </>
        )}
        <GroupLabel expanded={expanded} spaced={canOrganize}>Discover</GroupLabel>
        {ATTENDEE_NAV.map((item) => (
          <Row key={item.href} item={item} active={isActive(item.href)} expanded={expanded} />
        ))}

        {isAdmin && (
          <>
            <GroupLabel expanded={expanded} spaced>Platform</GroupLabel>
            {ADMIN_NAV.map((item) => (
              <Row key={item.href} item={item} active={isActive(item.href)} expanded={expanded} />
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto flex flex-col items-stretch gap-1 border-t border-[color:var(--border-hairline)] px-3 py-4">
        {BOTTOM.map((item) => (
          <Row key={item.href} item={item} active={isActive(item.href)} expanded={expanded} />
        ))}
      </div>

      {/* Drag handle — invisible hit zone flush to the right edge. On
          hover a 1px nile line fades in so the affordance is discover-
          able without noise in the resting state. Rendered as a <div>
          with role="separator" rather than a <button> so the vertical
          aria-orientation is semantically valid (buttons don't support
          it per the ARIA spec). Hidden on mobile — drag-resize isn't a
          meaningful gesture on touch and the hit zone would interfere
          with horizontal swipes near the rail's right edge. */}
      {showResizeHandle && (
        <div
          role="separator"
          tabIndex={0}
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-valuemin={64}
          aria-valuemax={360}
          aria-valuenow={width}
          onPointerDown={onHandlePointerDown}
          onKeyDown={onHandleKeyDown}
          className={
            "group absolute top-0 right-0 h-full w-1.5 translate-x-1/2 cursor-col-resize " +
            "focus-visible:outline-none"
          }
        >
          <span
            aria-hidden
            className={
              "block h-full w-px mx-auto transition-colors " +
              (resizing ? "bg-nile" : "bg-transparent group-hover:bg-nile/60 group-focus-visible:bg-nile")
            }
          />
        </div>
      )}
    </aside>
  );
}

/* ─────────────────── Rows ─────────────────── */

function Row({ item, active, expanded }: { item: Item; active: boolean; expanded: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={rowClass(active, expanded)}
    >
      <LeftAccent active={active} />
      <IconSlot active={active}>{item.icon}</IconSlot>
      {expanded ? (
        <span className="truncate text-[14px] font-semibold">{item.label}</span>
      ) : (
        <Tooltip>{item.label}</Tooltip>
      )}
    </Link>
  );
}

function rowClass(active: boolean, expanded: boolean) {
  const base =
    "group relative flex items-center h-11 rounded-xl transition-colors " +
    (expanded ? "gap-3 px-3" : "justify-center");
  const state = active
    ? "bg-nile-50 text-nile-900"
    : "text-ink-700 hover:bg-cream-100 hover:text-ink-900";
  return `${base} ${state}`;
}

function LeftAccent({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full transition-colors " +
        (active ? "bg-nile" : "bg-transparent")
      }
    />
  );
}

function IconSlot({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={
        "flex h-8 w-8 shrink-0 items-center justify-center transition-colors " +
        (active ? "text-nile" : "text-ink-600 group-hover:text-ink-900")
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[20px] w-[20px]"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2.5 py-1 text-[12px] font-semibold text-white opacity-0 shadow-pop transition-opacity delay-75 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

function GroupLabel({
  children, expanded, spaced
}: { children: ReactNode; expanded: boolean; spaced?: boolean }) {
  if (!expanded) {
    return <span aria-hidden className={"mx-1 block h-px bg-[color:var(--border-hairline)] " + (spaced ? "my-3" : "my-2")} />;
  }
  return (
    <div className={"px-3 pb-2 " + (spaced ? "pt-4" : "pt-2")}>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {children}
      </span>
    </div>
  );
}
