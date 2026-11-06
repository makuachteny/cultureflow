"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Root route error boundary. Rendered when a server component or a
 * client component below /app throws. Uses the same editorial chrome
 * as /not-found so the two error states feel part of one family.
 *
 * Layout: `min-h-[80vh] flex items-center justify-center` gives real
 * vertical + horizontal centring inside the root layout's
 * `<main flex-1>`. Inner content capped at max-w-xl so it never
 * sprawls on wide displays, with generous mt-rhythm between blocks
 * so the announcement doesn't feel cramped.
 */
export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Always log to the browser console — production observability tools
    // (Sentry/Rollbar/LogRocket etc.) hook console.error to capture
    // unhandled UI errors. Suppressing in prod blinds those tools.
    // eslint-disable-next-line no-console
    console.error("[ui-error]", error.message, { digest: error.digest, stack: error.stack });

    // Best-effort beacon to the server logger so unhandled UI errors
    // land in the same JSON log stream as server errors. Fire-and-
    // forget; never blocks the user's recovery flow.
    try {
      const payload = JSON.stringify({
        message: error.message,
        digest:  error.digest,
        path:    typeof window !== "undefined" ? window.location.pathname : null,
        ua:      typeof navigator !== "undefined" ? navigator.userAgent : null
      });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/client-log", new Blob([payload], { type: "application/json" }));
      }
    } catch { /* never block the boundary on telemetry */ }
  }, [error]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <span
          aria-hidden
          className="flex h-24 w-24 items-center justify-center rounded-full bg-hibiscus/10 ring-1 ring-hibiscus/20"
        >
          <Image src="/logo-mark.svg" alt="" width={70} height={48} />
        </span>

        <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-hibiscus">
          Something went wrong
        </div>
        <h1 className="mt-3 font-display text-[32px] sm:text-[42px] lg:text-[52px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
          We hit a snag.
        </h1>
        <p className="mt-5 max-w-md text-[15px] sm:text-[16px] text-ink-600 leading-relaxed">
          The page couldn&rsquo;t load. It&rsquo;s probably us, not you — try
          again, or head home while we patch it up.
        </p>

        {error?.digest && (
          <p className="mt-4 text-[12px] text-ink-500 font-tabular">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
