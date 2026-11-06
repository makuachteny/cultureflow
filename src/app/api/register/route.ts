import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signUpSchema } from "@/lib/validators";
import { hit, clientIp } from "@/lib/rate-limit";

type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";

// Tight cap — creating an account is a human action.
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour per IP

export async function POST(req: Request) {
  const gate = hit(`register:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { email, password, name, city, country } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // NOTE: Returning 409 here is a known enumeration vector. The real
    // fix requires a transactional email provider so we can return a
    // uniform "Check your inbox" response and send an out-of-band
    // "you already have an account" nudge to the real owner. Until
    // email is wired, we keep the explicit 409 for UX — but the tight
    // 10/hr/IP rate limit above means the attacker can enumerate at
    // most 240 addresses per day per IP, which WAFs can catch.
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // First user with ADMIN_EMAIL gets admin; a seeded admin will own that email already.
  const role: Role = email === process.env.ADMIN_EMAIL?.toLowerCase() ? "ADMIN" : "ATTENDEE";

  const user = await prisma.user.create({
    data: { email, name, passwordHash, city, country, role }
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
