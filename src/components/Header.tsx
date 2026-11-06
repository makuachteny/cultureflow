import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import HelpMenu from "@/components/HelpMenu";
import Logo from "@/components/Logo";
import MobileMenu from "@/components/MobileMenu";
import { BRAND_HOME_LABEL } from "@/lib/brand";
import { HeaderQueryInput, HeaderCityInput } from "@/components/HeaderSearchInputs";

/**
 * Global site header — page-aligned chassis.
 *
 *   [ CultureFlow ]    [ 🔎 Search events  |  📍 Anywhere  (🔎) ]   Pricing  Find Events  Create Events  Help ▾  Find my tickets  Sign in
 *
 * Layout
 *   • Brand absolute-positioned flush against the LEFT viewport edge so
 *     the wordmark hugs the chrome.
 *   • Search + nav live inside a `max-w-7xl` content container with
 *     `px-4 sm:px-6 lg:px-8` — the same shape every page section uses
 *     below — so the **search pill's LEFT edge starts at the same
 *     x-position as the WELCOME copy** on the page beneath the header.
 *   • Search pill `flex-1` stretches from content-left to the nav at
 *     content-right. Nav lands on the same content-right edge as the
 *     hero copy below.
 */
export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border-hairline)] bg-[color:var(--color-bg)]">
      <div className="relative h-[72px]">
        {/* ───── Brand lockup (≥ md) ─────
            Pinned to the viewport edge with `left-1 sm:left-2 lg:left-3`. */}
        <Link
          href="/"
          className="absolute left-1 sm:left-2 lg:left-3 top-0 h-full hidden md:flex items-center z-10"
          aria-label={BRAND_HOME_LABEL}
        >
          <Logo variant="horizontal" size={40} href={null} />
        </Link>

        {/* ───── Hybrid content row ─────
            Mobile / tablet: native `px-4 sm:px-6` ladder — same padding
            the page sections use (`mx-auto max-w-7xl px-4 sm:px-6
            lg:px-8`), so brand and the right-side nav align pixel-for-
            pixel with the hero card and the welcome strip below.
            Desktop (lg): the LEFT padding stays calc-based so the search
            pill starts at WELCOME's x-position, but the RIGHT padding
            collapses to a small chrome-edge pad (`lg:pr-6`, 24 px from
            viewport-right) so the nav extends past the content column
            and uses the available right-side real-estate. */}
        <div className="flex h-full items-center gap-3 md:gap-4
                        px-4 sm:px-6
                        lg:pl-[max(2rem,calc((100vw-88rem)/2+2rem))]
                        lg:pr-6 xl:pr-8">
          {/* Mobile in-flow brand — visible below md (where the absolute
              brand is hidden). On mobile we render the mark only (no
              wordmark) so the search pill keeps room to breathe at 320 px. */}
          <Link
            href="/"
            className="md:hidden flex shrink-0 items-center"
            aria-label={BRAND_HOME_LABEL}
          >
            <Logo variant="mark" size={32} href={null} />
          </Link>

          {/* ───── Search pill ─────
              `flex-1` fills the gap between content-left (= WELCOME) and
              the nav at content-right. 44 px tall on mobile, 48 px from
              md:+. Below md the city sub-input + divider collapse so the
              query field + submit button still fit comfortably alongside
              the brand and avatar at narrow viewports. Border darkens
              slightly on hover/focus — no glow ring. */}
          <form
            action="/browse"
            className="flex flex-1 min-w-0 items-center rounded-full border border-[color:var(--border-hairline)] bg-white pl-1.5 pr-1.5 h-11 md:h-12 hover:border-[color:var(--border-strong)] focus-within:border-[color:var(--border-strong)] transition-colors"
          >
          <label className="flex h-full flex-1 items-center gap-2 px-3 md:px-4 min-w-0 cursor-text">
            <svg
              className="h-4 w-4 text-ink-700 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <Suspense fallback={null}>
              <HeaderQueryInput />
            </Suspense>
          </label>

          {/* Divider + city input — md:+ only. */}
          <span
            className="hidden md:block self-center h-6 w-px bg-[color:var(--border-strong)]"
            aria-hidden
          />

          <label className="hidden md:flex h-full flex-1 items-center gap-2 px-4 min-w-0 cursor-text">
            <svg
              className="h-4 w-4 text-ink-700 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <Suspense fallback={null}>
              <HeaderCityInput />
            </Suspense>
          </label>
          <button
            className="flex h-9 w-9 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-nile text-white hover:bg-nile-600 transition-colors"
            type="submit"
            aria-label="Search"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>

        {/* ───── Right-side nav — flush to the viewport's right edge ─────
            Below md, only the avatar (when signed in) + hamburger remain
            visible — every other link collapses into the MobileMenu drawer
            so the row stays single-line at 320 px. */}
        <nav className="shrink-0 flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          <Link
            href="/pricing"
            className="hidden md:inline-flex items-center h-10 text-[14px] font-semibold text-ink-900 hover:text-nile transition-colors whitespace-nowrap"
          >
            Pricing
          </Link>
          <Link
            href="/browse"
            className="hidden lg:inline-flex items-center h-10 text-[14px] font-semibold text-ink-900 hover:text-nile transition-colors whitespace-nowrap"
          >
            Find Events
          </Link>
          <Link
            href="/events/new"
            className="hidden lg:inline-flex items-center h-10 text-[14px] font-semibold text-ink-900 hover:text-nile transition-colors whitespace-nowrap"
          >
            Create Events
          </Link>

          <HelpMenu />

          {user ? (
            <>
              <Link
                href="/tickets"
                className="hidden md:inline-flex items-center h-10 text-[14px] font-semibold text-ink-900 hover:text-nile transition-colors whitespace-nowrap"
              >
                Find my tickets
              </Link>

              {/* Avatar chip — role-aware destination.
                   ORGANIZER / ADMIN land on /dashboard (their primary
                   work surface). ATTENDEE land on /account (their
                   profile + settings, since they don't have a dashboard
                   shell). The dashboard layout would redirect attendees
                   back to /browse anyway; routing them straight to
                   /account avoids that bounce.

                   Hidden below md so the mobile chrome shows only one
                   profile entry-point — the hamburger drawer, which
                   surfaces the avatar + name as the first card. Two
                   identical-looking circles next to each other (search
                   button + avatar) made the row read as duplicated. */}
              <Link
                href={user.role === "ATTENDEE" ? "/account" : "/dashboard"}
                aria-label={user.role === "ATTENDEE" ? "Account" : "Dashboard"}
                className="hidden md:flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile/40"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover border border-[color:var(--border-hairline)]"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-nile text-white grid place-items-center text-[13px] font-bold">
                    {(user.name?.[0] ?? user.email?.[0] ?? "T").toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/tickets"
                className="hidden sm:inline-flex items-center h-10 text-[14px] font-semibold text-ink-900 hover:text-nile transition-colors whitespace-nowrap"
              >
                Find my tickets
              </Link>

              {/* Sign in — plain bold text, same weight as the other nav
                  links. No pill, no background tint. Hidden below md so
                  the mobile drawer is the single source of auth controls
                  and the header row never wraps. */}
              <Link
                href="/sign-in"
                className="hidden md:inline-flex items-center h-10 text-[14px] font-semibold text-ink-900 hover:text-nile transition-colors whitespace-nowrap"
              >
                Sign in
              </Link>
            </>
          )}

          {/* Mobile hamburger — opens the drawer that holds every link
              hidden above. Always last so it sits flush against the
              chrome's right edge. */}
          <MobileMenu
            viewer={user ? {
              name: user.name ?? null,
              email: user.email ?? null,
              image: user.image ?? null,
              role: user.role ?? null
            } : null}
          />
        </nav>
        </div>
      </div>
    </header>
  );
}
