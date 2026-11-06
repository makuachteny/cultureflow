// Sanity-check login end-to-end against seed data. Mirrors the logic in
// lib/auth.ts Credentials `authorize()` so a green run here = the
// NextAuth flow will also succeed for these creds.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function tryLogin(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    return { ok: false, reason: user ? `status=${user.status}` : "no-user" };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok
    ? { ok: true, role: user.role, id: user.id, name: user.name }
    : { ok: false, reason: "bad-password" };
}

const creds = [
  ["admin@cultureflow.example", "admin1234"],
  ["alek@cultureflow.example",  "password123"],
  ["mary@cultureflow.example",  "password123"],
  ["admin@cultureflow.example", "wrong-password"] // negative control
];

for (const [email, password] of creds) {
  const r = await tryLogin(email, password);
  console.log(
    r.ok
      ? `✓  ${email} → ${r.role}  ${r.name}`
      : `✗  ${email}  (${r.reason})`
  );
}

const total = await prisma.user.count();
console.log(`\nTotal users in DB: ${total}`);
await prisma.$disconnect();
