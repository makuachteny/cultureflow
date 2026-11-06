"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary — catches errors in the root layout
 * itself (where the regular `app/error.tsx` can't help, because the
 * layout fails before its children get a chance to render).
 *
 * Includes its own <html> + <body> because Next strips the root
 * layout when this boundary fires.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[ui-fatal]", error.message, { digest: error.digest, stack: error.stack });
    try {
      const payload = JSON.stringify({
        fatal:   true,
        message: error.message,
        digest:  error.digest,
        path:    typeof window !== "undefined" ? window.location.pathname : null
      });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/client-log", new Blob([payload], { type: "application/json" }));
      }
    } catch { /* never block recovery */ }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#FCFCFA", color: "#0E1F4A" }}>
        <div style={{ maxWidth: 480, margin: "10vh auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: "#C73B5C", textTransform: "uppercase" }}>
            Something broke
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 16px", lineHeight: 1.05 }}>
            We hit a wall.
          </h1>
          <p style={{ fontSize: 15, color: "#52525B", lineHeight: 1.6 }}>
            The page failed to load. Try again, or{" "}
            <a href="/" style={{ color: "#0E1F4A", fontWeight: 600 }}>head home</a>.
          </p>
          {error?.digest && (
            <p style={{ fontSize: 12, color: "#71717A", marginTop: 16, fontFamily: "ui-monospace, monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 32, padding: "10px 20px", fontSize: 14, fontWeight: 600,
              color: "#fff", background: "#0E1F4A", border: 0, borderRadius: 8, cursor: "pointer"
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
