import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hit, clientIp } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import ContactOrganizerForm from "./ContactOrganizerForm";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where:  { id: params.id },
    select: { name: true, status: true }
  });
  if (!user || user.status !== "ACTIVE") return { title: "Organizer not found" };
  return {
    title: `Contact ${user.name ?? "organizer"}`,
    description: `Send a direct message to ${user.name ?? "this organizer"}.`,
    alternates: { canonical: `/organizer/${params.id}/contact` },
    /* Private surface — attendees contacting an organizer is a user
       interaction, not crawl-worthy content. */
    robots: { index: false, follow: false }
  };
}

const schema = z.object({
  name:    z.string().trim().min(2).max(120),
  email:   z.string().trim().toLowerCase().email().max(200),
  subject: z.string().trim().min(2).max(140),
  body:    z.string().trim().min(10).max(5000)
});

export default async function ContactOrganizerPage({ params }: Props) {
  const organizer = await prisma.user.findUnique({
    where:  { id: params.id },
    select: { id: true, name: true, image: true, email: true, status: true, role: true }
  });
  if (!organizer || organizer.status !== "ACTIVE") return notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const me = viewerId
    ? await prisma.user.findUnique({
        where:  { id: viewerId },
        select: { name: true, email: true }
      })
    : null;

  // Organizers can't DM themselves — bounce to the public profile.
  if (viewerId && viewerId === organizer.id) {
    redirect(`/organizer/${organizer.id}`);
  }

  /**
   * Server action. Captured here (not in a separate file) so the
   * current `organizer` / `me` context is closed over without passing
   * them through as form fields — the ids come from the route and
   * the session, not the submitted form.
   */
  async function submit(
    formData: FormData
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    "use server";

    const h = headers();
    const ipHeader =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip")?.trim() ??
      "unknown";
    const fakeReq = new Request("http://x/", { headers: { "x-forwarded-for": ipHeader } });
    const bucket = hit(`organizer-contact:${clientIp(fakeReq)}`, 5, 60 * 60 * 1000);
    if (!bucket.ok) {
      return { ok: false, error: "You've sent a few messages recently — give us a bit, then try again." };
    }

    const raw = {
      name:    formData.get("name"),
      email:   formData.get("email"),
      subject: formData.get("subject"),
      body:    formData.get("body")
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your inputs." };
    }

    const freshViewer = await auth();
    const senderUserId = freshViewer?.user?.id ?? null;

    const ipHash = createHash("sha256")
      .update(`${ipHeader}|${process.env.NEXTAUTH_SECRET ?? ""}`)
      .digest("hex")
      .slice(0, 32);

    const record = await prisma.organizerMessage.create({
      data: {
        organizerId:  organizer!.id,
        senderUserId,
        senderEmail:  parsed.data.email,
        senderName:   parsed.data.name,
        subject:      parsed.data.subject,
        body:         parsed.data.body,
        ipHash
      }
    });

    log.info("organizer message received", {
      id: record.id,
      organizerId: record.organizerId,
      senderEmail: record.senderEmail,
      senderUserId
    });

    // Best-effort notification — emails the organizer's on-file
    // address with the attendee's message + a reply-to set to the
    // sender. In dev (no EMAIL_SERVER) just logs the envelope.
    try {
      if (organizer!.email) {
        await sendEmail({
          to:       organizer!.email,
          replyTo:  record.senderEmail,
          subject:  `[Message via profile] ${record.subject}`,
          text: [
            `From: ${record.senderName} <${record.senderEmail}>`,
            senderUserId ? `User: ${senderUserId}` : "",
            "",
            record.body,
            "",
            `— sent via /organizer/${organizer!.id}/contact at ${record.createdAt.toISOString()}`,
            `Reference: ${record.id}`
          ].filter(Boolean).join("\n")
        });
      }
    } catch (err) {
      log.error("organizer email send failed", {
        id: record.id,
        err: err instanceof Error ? err.message : String(err)
      });
    }

    return { ok: true };
  }

  const initial = (organizer.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16">
      <Link
        href={`/organizer/${organizer.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-nile"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to {organizer.name ?? "organizer"}
      </Link>

      {/* Organizer-identity header so the attendee knows exactly who
          they're writing to. */}
      <header className="mt-6 flex items-center gap-4">
        {organizer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organizer.image}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover border border-[color:var(--border-hairline)]"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-cream-100 text-[24px] font-extrabold text-ink-900">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
            Contact organizer
          </div>
          <h1 className="mt-1 font-display text-[24px] sm:text-[28px] font-extrabold text-ink-900 tracking-tight leading-tight">
            Message {organizer.name ?? "this organizer"}
          </h1>
        </div>
      </header>

      <p className="mt-4 text-[14px] text-ink-600 leading-relaxed">
        Your message goes straight to the organizer&apos;s inbox. For account,
        payment, or refund problems, use{" "}
        <Link href="/contact" className="text-nile hover:underline">our support channels</Link> instead.
      </p>

      <div className="mt-6">
        <ContactOrganizerForm
          action={submit}
          initialName={me?.name ?? ""}
          initialEmail={me?.email ?? ""}
          signedIn={!!me}
          organizerName={organizer.name ?? "the organizer"}
        />
      </div>
    </div>
  );
}
