// Tests for the requireActiveUser / requireAdmin helpers. We mock the
// `auth()` provider and Prisma client so the suite doesn't need a live
// database or NextAuth session.
//
// These guards are the linchpin of every authed write endpoint, so the
// negative paths (unauth, suspended, deleted) matter as much as the
// positive path.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

type MockSession = { user?: { id?: string; role?: string } } | null;
type MockUser = {
  id: string;
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
} | null;

const state: { session: MockSession; user: MockUser } = { session: null, user: null };

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(async () => state.session),
    signIn: vi.fn(),
    signOut: vi.fn()
  })
}));

vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        state.user?.id === id ? state.user : null
      )
    }
  }
}));

// Import after mocks are registered.
const { requireActiveUser, requireAdmin } = await import("../src/lib/auth");

beforeEach(() => {
  state.session = null;
  state.user = null;
});

describe("requireActiveUser", () => {
  it("returns 401 NextResponse when no session", async () => {
    const r = await requireActiveUser();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(401);
  });

  it("returns 401 when session has no user id", async () => {
    state.session = { user: {} };
    const r = await requireActiveUser();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(401);
  });

  it("returns 401 when user row is missing", async () => {
    state.session = { user: { id: "ghost" } };
    // state.user is null, so prisma returns null
    const r = await requireActiveUser();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(401);
  });

  it("returns 403 when user is SUSPENDED", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { id: "u1", role: "ATTENDEE", status: "SUSPENDED" };
    const r = await requireActiveUser();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(403);
  });

  it("returns 403 when user is DELETED (tombstone)", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { id: "u1", role: "ATTENDEE", status: "DELETED" };
    const r = await requireActiveUser();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(403);
  });

  it("returns {userId, role} when user is ACTIVE", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { id: "u1", role: "ORGANIZER", status: "ACTIVE" };
    const r = await requireActiveUser();
    expect(r).not.toBeInstanceOf(NextResponse);
    if (!(r instanceof NextResponse)) {
      expect(r.userId).toBe("u1");
      expect(r.role).toBe("ORGANIZER");
    }
  });
});

describe("requireAdmin", () => {
  it("passes requireActiveUser errors through (401)", async () => {
    const r = await requireAdmin();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(401);
  });

  it("returns 403 when active but non-admin", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { id: "u1", role: "ORGANIZER", status: "ACTIVE" };
    const r = await requireAdmin();
    expect(r).toBeInstanceOf(NextResponse);
    if (r instanceof NextResponse) expect(r.status).toBe(403);
  });

  it("returns {userId, role} when active + admin", async () => {
    state.session = { user: { id: "admin1" } };
    state.user = { id: "admin1", role: "ADMIN", status: "ACTIVE" };
    const r = await requireAdmin();
    expect(r).not.toBeInstanceOf(NextResponse);
    if (!(r instanceof NextResponse)) {
      expect(r.role).toBe("ADMIN");
    }
  });
});
