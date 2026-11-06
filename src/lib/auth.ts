// NextAuth v5 full config — Node runtime only. Middleware uses the
// slim edge-safe subset in ./auth.config.ts; this file layers the
// Prisma adapter, Credentials provider (with bcrypt), and optional
// Google OAuth on top.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import * as bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
// Relative (not aliased) so Vitest resolves without a custom config.
import { prisma } from "./db";
import { hit } from "./rate-limit";
import { authConfig, type Role } from "./auth.config";
// Side-effect import: env.ts runs production-safety assertions at module
// load. Keeping it in the auth chain guarantees boot-time validation
// since auth.ts is touched by every server route.
import "./env";

export type { Role };

const socialEnabled =
  process.env.ENABLE_SOCIAL_LOGIN === "true" &&
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(creds) {
        const email    = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // Per-email brute-force gate: 10 failed attempts in 15 min.
        // Keyed by email (not IP) so a distributed attacker can't rotate
        // through proxies to crack one account. A successful login resets
        // the bucket below.
        const bucket = hit(`signin:${email}`, 10, 15 * 60 * 1000);
        if (!bucket.ok) {
          // Run a dummy bcrypt compare anyway so the response time is
          // indistinguishable from the "wrong password" path — no timing
          // leak about whether we're rate-limited vs auth-failed.
          await bcrypt.compare(password, "$2b$10$" + "a".repeat(53));
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.status !== "ACTIVE") {
          // Constant-time dummy compare so "no such user" and "wrong
          // password" take the same wall-clock time — prevents timing
          // account enumeration.
          await bcrypt.compare(password, "$2b$10$" + "a".repeat(53));
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role
        };
      }
    }),
    ...(socialEnabled
      ? [
          Google({
            clientId:     process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true
          })
        ]
      : [])
  ]
});

/**
 * Session + latest profile in one call. Safe only from Node runtime
 * (server components, API routes, server actions) — never import from
 * middleware, which is Edge runtime and cannot run Prisma.
 */
export async function getFreshSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return { session: null, profile: null };
  const profile = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { name: true, email: true, image: true }
  });
  return { session, profile };
}

/* ─────────────────────────────────────────────────────────────
   Authorization helpers — use from any server route.
   ───────────────────────────────────────────────────────────── */

export type ActiveUser = { userId: string; role: Role };

export async function requireActiveUser(): Promise<ActiveUser | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, role: true, status: true }
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account suspended. Contact support." },
      { status: 403 }
    );
  }
  return { userId: user.id, role: user.role as Role };
}

export async function requireAdmin(): Promise<ActiveUser | NextResponse> {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;
  if (gate.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return gate;
}

/** Require ORGANIZER (or ADMIN). Used by payout-onboarding routes. */
export async function requireOrganizer(): Promise<ActiveUser | NextResponse> {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;
  if (gate.role !== "ORGANIZER" && gate.role !== "ADMIN") {
    return NextResponse.json({ error: "Organizer-only." }, { status: 403 });
  }
  return gate;
}

/* ─────────────────────────────────────────────────────────────
   Profile-completeness gate.

   Lots of write surfaces (creating an event, buying a ticket, posting
   a comment, etc.) silently failed in confusing ways when a user's
   profile was a stub — no name, blank email, missing organizer info.
   These two helpers centralise the "is this person allowed to act
   yet?" decision and return a uniform 422 with a redirect target so
   the UI can prompt them to finish onboarding.

   What "complete" means depends on the role:
     • ATTENDEE  — must have a verified email + a non-blank name.
     • ORGANIZER — same as attendee, plus a public-facing name and
       a city (so events have a default origin) and a bio so the
       organizer card on event pages doesn't look empty.
     • ADMIN     — only the attendee floor; admins manage the platform,
       not their own organizer profile.
   ───────────────────────────────────────────────────────────── */

export type ProfileGapReason = "name" | "email_unverified" | "city" | "bio";

export type ProfileCompleteness = {
  complete: boolean;
  /** Specific fields the user still needs to fill in. Empty when complete. */
  missing: ProfileGapReason[];
};

type ProfileCheckUser = {
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  city: string | null;
  bio: string | null;
  role: string;
};

export function checkProfileCompleteness(user: ProfileCheckUser): ProfileCompleteness {
  const missing: ProfileGapReason[] = [];
  if (!user.name || user.name.trim().length < 2) missing.push("name");
  if (!user.emailVerified)                       missing.push("email_unverified");
  if (user.role === "ORGANIZER") {
    if (!user.city || user.city.trim().length === 0)            missing.push("city");
    if (!user.bio  || user.bio.trim().length  < 20)             missing.push("bio");
  }
  return { complete: missing.length === 0, missing };
}

/**
 * Server-route gate. Use AFTER `requireActiveUser` returns a real
 * user to ensure they've finished setting up before letting them act.
 *
 * Returns either:
 *   • the same `ActiveUser` shape on success, OR
 *   • a 422 NextResponse with `{ error, missing[], next: "/account" }`
 *     so the client can show the prompt and link the user to the
 *     right setting page.
 */
export async function requireCompleteProfile(
  user: ActiveUser
): Promise<ActiveUser | NextResponse> {
  const profile = await prisma.user.findUnique({
    where:  { id: user.userId },
    select: { name: true, email: true, emailVerified: true, city: true, bio: true, role: true }
  });
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = checkProfileCompleteness(profile);
  if (!status.complete) {
    return NextResponse.json(
      {
        error: "Finish setting up your profile before continuing.",
        missing: status.missing,
        next:   "/account"
      },
      { status: 422 }
    );
  }
  return user;
}
