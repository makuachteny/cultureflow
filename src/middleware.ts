// Protects /dashboard, /tickets, /admin, and POST-like app routes.
// Instantiates NextAuth from the edge-safe config so bcryptjs and
// Prisma stay out of the middleware bundle.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  const needsAuth =
    path.startsWith("/dashboard") ||
    path.startsWith("/tickets")   ||
    path.startsWith("/admin")     ||
    // Signed-in app surfaces that sit outside /dashboard but carry the
    // same dashboard shell (sidebar + top bar). Gating here gives us a
    // true 307 before any layout runs — no sidebar flash for guests.
    path.startsWith("/account")   ||
    path.startsWith("/liked")     ||
    path.startsWith("/following") ||
    path.startsWith("/interests");
    // `/events/new` is public marketing; the builder now lives under
    // /dashboard/events/new, already covered by the /dashboard prefix.

  if (needsAuth && !isLoggedIn) {
    const url = new URL("/sign-in", nextUrl.origin);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // Already signed in? Don't let them sit on the auth pages — bounce
  // them forward. Also collapses the enumeration vector where a logged-
  // in attacker could probe /sign-in over and over.
  if (isLoggedIn && (path === "/sign-in" || path === "/sign-up")) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  if (path.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  // Dashboard is organizer-only — except for the event-creation entry
  // points, which auto-promote ATTENDEE → ORGANIZER on form submit
  // (see /api/events/route.ts). If we bounced attendees from these
  // paths they'd never reach the form to be promoted.
  // Attendees browsing the rest of the dashboard would land on empty
  // event/order/revenue surfaces — redirect those to /browse instead.
  const isDashboardEventCreate =
    path === "/dashboard/events/new" ||
    path === "/dashboard/events/templates" ||
    path.startsWith("/dashboard/events/templates/");
  if (
    path.startsWith("/dashboard") &&
    !isDashboardEventCreate &&
    req.auth?.user?.role === "ATTENDEE"
  ) {
    return NextResponse.redirect(new URL("/browse", nextUrl.origin));
  }

  // Propagate pathname so server layouts can decide which chrome to render.
  // Set request headers so server components can read via headers().
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", path);
  return NextResponse.next({ request: { headers: reqHeaders } });
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|css|js)).*)"]
};
