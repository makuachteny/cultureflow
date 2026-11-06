"use client";

import { useRouter } from "next/navigation";

/**
 * BackButton — a small "‹ Back" pill used on auth pages (sign-in,
 * sign-up) and any other surface that lives outside the global chrome.
 *
 * Behaviour:
 *   • If there is real browser history, calls `router.back()` so the
 *     user returns to where they came from.
 *   • Otherwise (direct loads, deep links, post-redirect landings where
 *     `window.history.length` is just the synthetic entry), routes to
 *     the configurable `fallback` (default `/`).
 *
 * The pill style matches the auth-page chrome — translucent white, soft
 * ring, subtle shadow — so it sits comfortably on the gradient backdrop.
 */
export default function BackButton({
  fallback = "/",
  label = "Back",
  className = ""
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={
        "inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 " +
        "text-[13px] font-semibold text-nile-900 shadow-sm " +
        "ring-1 ring-[color:var(--border-hairline)] " +
        "hover:bg-white hover:ring-[color:var(--border-strong)] transition " +
        className
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
