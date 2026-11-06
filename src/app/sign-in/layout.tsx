import type { Metadata } from "next";

/**
 * Layout-only file: exports route-specific metadata. Sign-in is a
 * client component so it can't export `metadata` directly; this layout
 * gives the route a proper <title> for browser tabs and SEO.
 */
export const metadata: Metadata = {
  title:       "Sign in",
  description: "Sign in to your CultureFlow account to manage tickets, follow organizers, and host events for the South Sudanese community."
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
