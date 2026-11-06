/**
 * Rate limiter with pluggable backends.
 *
 * Default: in-memory sliding window. Per-process, so behind multiple
 * Node replicas each replica enforces the limit independently — good
 * enough for basic abuse-throttling, not a substitute for WAF or
 * distributed limiting.
 *
 * For production fleets, set RATE_LIMIT_DRIVER=redis + install a redis
 * client, and swap in the Redis driver below. The public API (`hit`,
 * `clientIp`) stays identical.
 */

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the caller can retry without hitting the limit. */
  retryAfter: number;
  /** Remaining calls in this window. */
  remaining: number;
};

export interface RateLimitDriver {
  /** Record one hit. Returns whether the caller is still under `limit`
   *  over the preceding `windowMs`. */
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> | RateLimitResult;
  readonly name: string;
}

/* ─────────────────────── In-memory driver ─────────────────────── */

type Bucket = { count: number; resetAt: number };

class InMemoryDriver implements RateLimitDriver {
  readonly name = "memory";
  private buckets = new Map<string, Bucket>();

  constructor() {
    // Periodically sweep expired buckets so the Map doesn't grow
    // unbounded. Node cleans this up on process exit; we never close it.
    if (typeof globalThis !== "undefined" && !("__tribe_rl_sweeper__" in globalThis)) {
      (globalThis as unknown as { __tribe_rl_sweeper__: boolean }).__tribe_rl_sweeper__ = true;
      setInterval(() => {
        const now = Date.now();
        for (const [k, v] of this.buckets) if (v.resetAt < now) this.buckets.delete(k);
      }, 60_000).unref?.();
    }
  }

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfter: 0, remaining: limit - 1 };
    }
    existing.count += 1;
    const remaining = Math.max(0, limit - existing.count);
    if (existing.count > limit) {
      return {
        ok: false,
        retryAfter: Math.ceil((existing.resetAt - now) / 1000),
        remaining: 0
      };
    }
    return { ok: true, retryAfter: 0, remaining };
  }
}

/* ─────────────────────── Redis driver (stub) ─────────────────────── */

class RedisDriver implements RateLimitDriver {
  readonly name = "redis";
  hit(_key: string, _limit: number, _windowMs: number): RateLimitResult {
    throw new Error(
      "[rate-limit] Redis driver isn't implemented yet. Install `ioredis` or " +
      "`@upstash/redis`, replace this class with a SETEX+INCR implementation, " +
      "and set REDIS_URL. Contract: return RateLimitResult synchronously or " +
      "as a Promise; the sites that call `hit()` support both."
    );
  }
}

/* ─────────────────────── Resolver ────────────────────────── */

function pickDriver(): RateLimitDriver {
  const which = (process.env.RATE_LIMIT_DRIVER ?? "memory").toLowerCase();
  switch (which) {
    case "memory": return new InMemoryDriver();
    case "redis":  return new RedisDriver();
    default:
      throw new Error(`[rate-limit] Unknown RATE_LIMIT_DRIVER="${which}". Use "memory" or "redis".`);
  }
}

const driver = pickDriver();

/**
 * Record one hit against `key` and return whether it's within `limit`
 * per `windowMs`. Key should be `${ip}:${route}` or similar.
 *
 * Synchronous today (in-memory). If you swap in the Redis driver,
 * callers can still `await` the result — the signature below already
 * accepts a Promise return.
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const r = driver.hit(key, limit, windowMs);
  // In-memory returns sync; Redis returns Promise. Callers are all
  // sync today; when you migrate to Redis, `await hit(...)` at the
  // call sites and change this signature's return to Promise.
  if (r instanceof Promise) {
    throw new Error(
      "[rate-limit] Async driver in use but callers expect sync. " +
      "Update call sites to `await hit(...)` before flipping RATE_LIMIT_DRIVER."
    );
  }
  return r;
}

/**
 * Extract the best-effort client IP from common proxy headers, falling
 * back to a constant for local dev. Never throws.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Convenience wrapper: rate-limit by route + IP and return either a
 * 429 Response (with Retry-After + X-RateLimit-* headers) or `null`
 * meaning the caller is within budget.
 *
 *   const limited = guard(req, "likes", 30, 60_000);
 *   if (limited) return limited;
 *
 * Defaults are conservative; tighten per-endpoint when justified
 * (sign-up: 5/min, checkout: 30/min, comment: 10/min, etc.).
 */
import { NextResponse } from "next/server";

export function guard(
  req: Request,
  route: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const r = hit(`${route}:${clientIp(req)}`, limit, windowMs);
  if (r.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After":         String(r.retryAfter),
        "X-RateLimit-Limit":   String(limit),
        "X-RateLimit-Remaining": "0"
      }
    }
  );
}
