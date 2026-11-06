/**
 * Transactional email module.
 *
 * In development (EMAIL_SERVER empty), `send()` logs the envelope so
 * developers can verify the content without setting up SMTP. In
 * production EMAIL_SERVER must be set — `env.ts` doesn't force this
 * because email is still incoming, but callers should treat a
 * development-mode delivery as a no-op.
 *
 * Wire in real delivery by installing `nodemailer` and implementing
 * the SMTP branch below. The public API stays identical.
 *
 * Usage:
 *   await sendEmail({
 *     to: "attendee@example.com",
 *     subject: "Your tickets for {{ event }}",
 *     text: "...",
 *     html: "..."
 *   });
 */

import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export type EmailMessage = {
  to:      string | string[];
  subject: string;
  text:    string;
  html?:   string;
  replyTo?: string;
};

export type EmailSendResult = {
  delivered: boolean;
  /** Dev mode logs instead of sending; this flag lets callers surface
   *  "check your email" UX even when we haven't actually sent. */
  simulated: boolean;
};

export async function sendEmail(msg: EmailMessage): Promise<EmailSendResult> {
  const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;

  if (!env.EMAIL_SERVER) {
    // Dev / staging fallback: log the envelope + a short body preview.
    // Never log the full body — it may contain ticket QR tokens or
    // password-reset links that shouldn't persist in log aggregators.
    log.info("email (dev, not sent)", {
      to,
      subject: msg.subject,
      preview: msg.text.slice(0, 140)
    });
    return { delivered: false, simulated: true };
  }

  // ─────────────────── Production SMTP branch ───────────────────
  //
  // Implement with nodemailer:
  //
  //   import nodemailer from "nodemailer";
  //   const transport = nodemailer.createTransport(env.EMAIL_SERVER);
  //   await transport.sendMail({
  //     from:    env.EMAIL_FROM,
  //     to, replyTo: msg.replyTo,
  //     subject: msg.subject,
  //     text:    msg.text,
  //     html:    msg.html
  //   });
  //   return { delivered: true, simulated: false };
  //
  // Leaving this as an explicit throw rather than a silent no-op so
  // an ops oversight (EMAIL_SERVER set but nodemailer not installed)
  // turns into a loud runtime error instead of lost emails.
  throw new Error(
    "[email] EMAIL_SERVER is set but the SMTP transport isn't wired. " +
    "Install nodemailer and implement the production branch in src/lib/email.ts."
  );
}
