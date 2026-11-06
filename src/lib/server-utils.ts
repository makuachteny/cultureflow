// Server-only helpers used when issuing tickets. Keeping `node:crypto` out of
// `utils.ts` means client bundles don't accidentally pull in node internals.
// Only import from server code (API routes, server components).

import { randomBytes } from "node:crypto";

/** Short, human-readable ticket check-in code (e.g. "K3P7QA"). */
export function makeTicketCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Opaque token embedded in the ticket QR code. */
export function makeOpaqueToken(byteLength = 24): string {
  return randomBytes(byteLength).toString("base64url");
}
