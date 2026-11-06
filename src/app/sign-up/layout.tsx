import type { Metadata } from "next";

/**
 * Layout-only file: exports route-specific metadata. Sign-up is a
 * client component so it can't export `metadata` directly; this layout
 * gives the route a proper <title> for browser tabs and SEO.
 */
export const metadata: Metadata = {
  title:       "Create your account",
  description: "Join CultureFlow — discover events for South Sudanese communities at home and across the diaspora, host your own gatherings in minutes."
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
