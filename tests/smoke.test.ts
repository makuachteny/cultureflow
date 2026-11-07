// Smoke tests — pure-function validators and taxonomy contracts so typos
// or enum drift fails fast in CI. Expand with Playwright for real e2e once
// the app is deployed and has a stable URL.

import { describe, expect, it } from "vitest";
import { signUpSchema, eventCreateSchema, checkoutSchema } from "../src/lib/validators";
import { CATEGORIES, TRIBE_SUGGESTIONS, TRIBE_VISIBILITY_OPTIONS, FEATURED_CITIES } from "../src/lib/taxonomy";
import { formatPrice, slugify, cn } from "../src/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Validators
   ───────────────────────────────────────────────────────────── */

describe("signUpSchema", () => {
  it("accepts a valid sign up", () => {
    const r = signUpSchema.safeParse({
      name: "Alek Deng", email: "alek@example.com", password: "password123"
    });
    expect(r.success).toBe(true);
  });
  it("rejects short passwords", () => {
    const r = signUpSchema.safeParse({ name: "A B", email: "a@b.com", password: "123" });
    expect(r.success).toBe(false);
  });
  it("rejects invalid emails", () => {
    const r = signUpSchema.safeParse({ name: "A B", email: "not-an-email", password: "password123" });
    expect(r.success).toBe(false);
  });
  it("rejects names shorter than 2 chars", () => {
    const r = signUpSchema.safeParse({ name: "A", email: "a@b.com", password: "password123" });
    expect(r.success).toBe(false);
  });
});

describe("eventCreateSchema", () => {
  const base = {
    title: "Test event", summary: "an event summary", description: "a description",
    category: "COMMUNITY" as const, type: "IN_PERSON" as const,
    startsAt: new Date(Date.now() + 3600_000).toISOString(),
    endsAt:   new Date(Date.now() + 7200_000).toISOString(),
    ticketTiers: [{ name: "GA", priceCents: 0, quantity: 10, currency: "USD" }],
    publish: true
  };

  it("accepts a valid event", () => {
    expect(eventCreateSchema.safeParse(base).success).toBe(true);
  });
  it("rejects end before start", () => {
    const now = new Date();
    const before = new Date(now.getTime() - 3600_000);
    const r = eventCreateSchema.safeParse({
      ...base, startsAt: now.toISOString(), endsAt: before.toISOString()
    });
    expect(r.success).toBe(false);
  });
  it("rejects SELECTED_TRIBES with empty visibleTribes", () => {
    const r = eventCreateSchema.safeParse({
      ...base, tribeVisibility: "SELECTED_TRIBES", visibleTribes: []
    });
    expect(r.success).toBe(false);
  });
  it("accepts SELECTED_TRIBES with at least one tribe", () => {
    const r = eventCreateSchema.safeParse({
      ...base, tribeVisibility: "SELECTED_TRIBES", visibleTribes: ["dinka"]
    });
    expect(r.success).toBe(true);
  });
  it("defaults tribeVisibility to EVERYONE", () => {
    const r = eventCreateSchema.safeParse(base);
    if (r.success) expect(r.data.tribeVisibility).toBe("EVERYONE");
  });
  it("rejects invalid category", () => {
    const r = eventCreateSchema.safeParse({ ...base, category: "NOT_A_CATEGORY" });
    expect(r.success).toBe(false);
  });
  it("requires at least one ticket tier", () => {
    const r = eventCreateSchema.safeParse({ ...base, ticketTiers: [] });
    expect(r.success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("requires at least one item", () => {
    const r = checkoutSchema.safeParse({
      eventId: "e1", items: [], attendeeName: "A", attendeeEmail: "a@b.com"
    });
    expect(r.success).toBe(false);
  });
  it("accepts a valid checkout", () => {
    const r = checkoutSchema.safeParse({
      eventId: "e1",
      items: [{ tierId: "t1", quantity: 2 }],
      attendeeName: "Abraham", attendeeEmail: "a@b.com"
    });
    expect(r.success).toBe(true);
  });
  it("rejects zero-quantity items", () => {
    const r = checkoutSchema.safeParse({
      eventId: "e1",
      items: [{ tierId: "t1", quantity: 0 }],
      attendeeName: "A B", attendeeEmail: "a@b.com"
    });
    expect(r.success).toBe(false);
  });
});

/* ─────────────────────────────────────────────────────────────
   Taxonomy integrity — keeps dropdowns and enums in sync.
   ───────────────────────────────────────────────────────────── */

describe("taxonomy", () => {
  it("has 12 event categories matching the Prisma enum", () => {
    const keys = CATEGORIES.map((c) => c.key).sort();
    expect(keys).toEqual(
      ["BUSINESS","COMMUNITY","CULTURAL","EDUCATION","FAITH","FAMILY",
       "FUNDRAISER","MUSIC","NETWORKING","OTHER","SPORTS","WEDDING"].sort()
    );
  });
  it("every category has a photo path under /community/", () => {
    // Images are now shipped locally from /public/community/ — see
    // scripts/download-community-photos.mjs.
    for (const c of CATEGORIES) {
      expect(c.image).toMatch(/^\/community\/[a-z0-9-]+\.jpg$/);
    }
  });
  it("has tribe suggestions with no duplicates", () => {
    // The tribe list is free-text in the UI; TRIBE_SUGGESTIONS is a small
    // seed of quick-add chips. We just verify the seed itself is clean.
    expect(TRIBE_SUGGESTIONS.length).toBeGreaterThan(0);
    expect(new Set(TRIBE_SUGGESTIONS).size).toBe(TRIBE_SUGGESTIONS.length);
    for (const s of TRIBE_SUGGESTIONS) {
      expect(s.length).toBeGreaterThan(0);
      expect(s.length).toBeLessThanOrEqual(40);
    }
  });
  it("has 3 tribe-visibility options matching the Prisma enum", () => {
    const values = TRIBE_VISIBILITY_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(["EVERYONE", "OWN_TRIBE", "SELECTED_TRIBES"]);
  });
  it("has featured cities with country set", () => {
    for (const c of FEATURED_CITIES) {
      expect(c.slug).toMatch(/^[a-z-]+$/);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.country.length).toBeGreaterThan(0);
    }
  });
});

/* ─────────────────────────────────────────────────────────────
   Utility functions
   ───────────────────────────────────────────────────────────── */

describe("formatPrice", () => {
  it("renders free for 0 cents", () => {
    expect(formatPrice(0)).toBe("Free");
  });
  it("formats USD dollars and cents", () => {
    expect(formatPrice(2599)).toBe("$25.99");
  });
  it("falls back gracefully on unknown currency", () => {
    // Should not throw even with made-up currency codes.
    expect(() => formatPrice(1000, "ZZZ")).not.toThrow();
  });
});

describe("slugify", () => {
  it("normalizes spaces and casing", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips punctuation", () => {
    expect(slugify("Juba — Town Hall!")).toBe("juba-town-hall");
  });
  it("caps length at 80 chars", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe("cn", () => {
  it("joins truthy class names with spaces", () => {
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
  });
});
