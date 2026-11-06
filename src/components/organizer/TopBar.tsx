import Link from "next/link";
import { getFreshSessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

/**
 * Dashboard top bar. Carries:
 *   • a "Find events" back-link to the public surface
 *   • the persistent "Create event" quick action
 *   • the signed-in user's identity chip (links to /account)
 *   • a logout button next to the chip (the sidebar no longer carries
 *     this — keeping it in one place avoids the duplicate affordance).
 */
export default async function TopBar() {
  // JWT session carries a stale display-name snapshot; read the live
  // User row so Settings → Profile edits reflect on the very next render.
  const { session, profile } = await getFreshSessionUser();
  const displayName = profile?.name  ?? session?.user?.name  ?? session?.user?.email ?? "";
  const image       = profile?.image ?? session?.user?.image ?? null;
  const role        = session?.user?.role ?? null;
  const initials = (displayName || "")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "T";

  // Role badge styling — admin gets the loudest treatment (it's the most
  // privileged), organizer a quieter nile pill, attendee no badge. Both
  // pills run on a stronger tint than before so the chip reads as a real
  // status marker against the white topbar instead of fading into it.
  const roleBadge =
    role === "ADMIN"     ? { label: "Admin",     cls: "bg-hibiscus/15 text-hibiscus ring-1 ring-inset ring-hibiscus/40" } :
    role === "ORGANIZER" ? { label: "Organizer", cls: "bg-nile-100    text-nile-700  ring-1 ring-inset ring-nile/30"     } :
    null;

  return (
    <header className="no-print sticky top-0 z-20 border-b border-[color:var(--border-hairline)] bg-white">
      {/* Inner container matches the main content's gutters so the
          "Create event" button and the avatar sit on the same right
          edge as the cards below. */}
      <div className="flex h-[60px] sm:h-[72px] w-full items-center gap-2 sm:gap-3 px-4 sm:px-8 lg:px-12">
        {/* Back to the public events surface — the dashboard is a
            workspace, but organizers need a one-tap path back to the
            buyer's view (to QA an event listing, share a link, etc.). */}
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-full text-[13px] font-semibold text-ink-700 hover:text-nile-900 hover:bg-cream-100 transition-colors"
          aria-label="Back to events"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Find events
        </Link>

        {/* Spacer pushes the right-side actions to the right edge. */}
        <div className="flex-1" aria-hidden />

        {/* Right-side cluster — every control is h-9 so the baseline
            holds clean across the row. The "Create event" CTA used to
            live here, but the dashboard hero already hosts a primary
            "Create event" button (and the sidebar links to the same
            destination), so a third entry-point on the topbar was just
            noise. Removing it leaves room for the identity chip alone. */}
        <div className="flex items-center gap-2.5">
          {session?.user && (
            <>
              {roleBadge && (
                <span className={`hidden sm:inline-flex items-center h-9 rounded-full px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] ${roleBadge.cls}`}>
                  {roleBadge.label}
                </span>
              )}

              <Link
                href="/account"
                aria-label={`Account — ${displayName}`}
                title={displayName}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-cream-100 motion-safe:transition-colors"
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover border border-[color:var(--border-hairline)]"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nile text-[11.5px] font-bold text-white tracking-wide">
                    {initials}
                  </span>
                )}
              </Link>

              <LogoutButton />
            </>
          )}

          {!session?.user && (
            <Link
              href="/sign-in"
              className="inline-flex items-center h-9 px-3 rounded-full text-[13px] font-semibold text-ink-700 hover:bg-cream-100 motion-safe:transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
