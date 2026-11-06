/**
 * Return a same-origin path safe to pass to `router.push()` /
 * `redirect()`. Rejects absolute URLs to foreign hosts (prevents open
 * redirect), rejects protocol-relative URLs like `//evil.com/path`,
 * and rejects anything that doesn't start with `/`.
 *
 * Usage:
 *   const raw = params.get("callbackUrl");
 *   const next = safeCallback(raw, "/");
 *   router.push(next);
 */
export function safeCallback(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  try {
    // Relative paths only — must begin with "/" and must not be
    // protocol-relative ("//host/…") which the browser treats as
    // absolute against the current scheme.
    if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;

    // Reject shell-level escapes that could be mis-parsed downstream.
    if (raw.includes("\\") || raw.includes("\x00")) return fallback;

    // Sanity-parse against a dummy origin to confirm it resolves to a
    // same-origin location. Any parse error → fallback.
    const u = new URL(raw, "http://localhost");
    if (u.origin !== "http://localhost") return fallback;

    // Strip any fragment so the caller doesn't accidentally land on
    // #javascript:... style quirks.
    return u.pathname + u.search;
  } catch {
    return fallback;
  }
}
