// Rate-limiter tests — lock down the sliding-window contract so
// regressions can't silently widen the gate.

import { describe, expect, it } from "vitest";
import { hit, clientIp } from "../src/lib/rate-limit";

// Each test uses a unique key to avoid bleed between cases since
// the underlying Map is module-scoped.
function key(name: string) { return `test:${name}:${Math.random()}`; }

describe("rate-limit.hit", () => {
  it("allows calls under the limit", () => {
    const k = key("under");
    const r1 = hit(k, 3, 60_000);
    const r2 = hit(k, 3, 60_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("blocks the call that crosses the limit", () => {
    const k = key("over");
    hit(k, 2, 60_000);
    hit(k, 2, 60_000);
    const r3 = hit(k, 2, 60_000);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfter).toBeGreaterThan(0);
    expect(r3.remaining).toBe(0);
  });

  it("resets the window once it elapses", async () => {
    const k = key("reset");
    const short = 30; // 30 ms window
    expect(hit(k, 1, short).ok).toBe(true);
    expect(hit(k, 1, short).ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, short + 5));
    expect(hit(k, 1, short).ok).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    const a = key("a");
    const b = key("b");
    hit(a, 1, 60_000);
    expect(hit(a, 1, 60_000).ok).toBe(false);
    // `b` is a fresh bucket — still within the limit.
    expect(hit(b, 1, 60_000).ok).toBe(true);
  });
});

describe("rate-limit.clientIp", () => {
  function fakeReq(headers: Record<string, string>): Request {
    return new Request("http://example.com", { headers });
  }

  it("prefers x-forwarded-for (first hop)", () => {
    expect(clientIp(fakeReq({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" }))).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(fakeReq({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no hint header is present", () => {
    expect(clientIp(fakeReq({}))).toBe("unknown");
  });
});
