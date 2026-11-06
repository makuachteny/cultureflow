"use client";

import { usePathname } from "next/navigation";

/**
 * Path-based chrome gate. Any route whose path starts with one of
 * BARE_PREFIXES renders without the global Header/Footer — used for
 * auth flows, onboarding, and the dashboard/admin shells that have
 * their own chrome. Client-side so it reacts to `next/navigation`
 * transitions, which the old `headers()`-based approach did not.
 */
const BARE_PREFIXES = [
  "/dashboard", "/admin", "/sign-in", "/sign-up", "/welcome",
  // Signed-in app surfaces that carry the dashboard sidebar shell.
  // /tickets, /liked, /following intentionally omitted — they ship as
  // public-style profile sub-pages with the global Header/Footer so
  // navigation between them never crosses a chrome boundary.
  "/account", "/interests"
];

export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const hide = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (hide) return null;
  return <>{children}</>;
}
