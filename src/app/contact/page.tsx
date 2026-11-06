import Link from "next/link";
import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { BRAND_NAME, brandEmail } from "@/lib/brand";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hit, clientIp } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: `Questions, partnerships, press, or support — reach the ${BRAND_NAME} team.`,
  alternates: { canonical: "/contact" }
};

/* Known topics + the inbox each routes to. `key` matches the Prisma
 * `ContactTopic` enum so we can store it directly. */
const TOPICS = [
  { key: "SUPPORT",      label: "Support",        inbox: "help" as const,         blurb: "Problem with a ticket, event, or payment? This is the fastest route." },
  { key: "PARTNERSHIPS", label: "Partnerships",   inbox: "partnerships" as const, blurb: "Churches, cultural associations, venues, media, telcos — we want to hear from you." },
  { key: "PRESS",        label: "Press",          inbox: "press" as const,        blurb: "Story ideas, quotes, background briefings." },
  { key: "TRUST",        label: "Trust & safety", inbox: "trust" as const,        blurb: "Report an event, an organizer, or a safety concern. Confidential." },
  { key: "PREMIUM",      label: "Premium plan",   inbox: "partnerships" as const, blurb: "Early-access to the Premium plan — discounted fees, priority support, custom branding." },
  { key: "ADS",          label: "Ad launches",    inbox: "partnerships" as const, blurb: "Native ad launches organizers ask for. Tell us what campaigns you'd run." },
  { key: "PROMOS",       label: "Featured promos",inbox: "partnerships" as const, blurb: "Featured placements — share your event and budget." },
  { key: "EXTENSIONS",   label: "Integrations",   inbox: "partnerships" as const, blurb: "Which tool should we integrate next?" },
  { key: "API",          label: "Developer API",  inbox: "partnerships" as const, blurb: "Early access to the public API + webhooks." },
  { key: "OTHER",        label: "Something else", inbox: "help" as const,         blurb: "Anything that doesn't fit the other buckets." }
];

type TopicKey = (typeof TOPICS)[number]["key"];
const TOPIC_KEYS = new Set(TOPICS.map((t) => t.key));

/* Map the legacy lower-case topic slugs from existing links
 * (/contact?topic=premium etc.) to the new enum keys. */
const LEGACY_TOPIC_ALIAS: Record<string, TopicKey> = {
  premium:    "PREMIUM",
  ads:        "ADS",
  promos:     "PROMOS",
  extensions: "EXTENSIONS",
  api:        "API"
};

const schema = z.object({
  name:    z.string().trim().min(2).max(120),
  email:   z.string().trim().toLowerCase().email().max(200),
  subject: z.string().trim().min(2).max(140),
  body:    z.string().trim().min(10).max(5000),
  topic:   z.string().refine((t) => TOPIC_KEYS.has(t), "Pick a valid topic")
});

async function submitContactMessage(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  "use server";

  // Rate limit — 5 messages / hour / IP. Contact abuse is usually
  // bot spam, so the lower cap vs. waitlist/subscribe is deliberate.
  const h = headers();
  const ipHeader =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    "unknown";
  const fakeReq = new Request("http://x/", {
    headers: { "x-forwarded-for": ipHeader }
  });
  const bucket = hit(`contact:${clientIp(fakeReq)}`, 5, 60 * 60 * 1000);
  if (!bucket.ok) {
    return { ok: false, error: "You've sent a few messages recently — give us a bit, then try again." };
  }

  const raw = {
    name:    formData.get("name"),
    email:   formData.get("email"),
    subject: formData.get("subject"),
    body:    formData.get("body"),
    topic:   formData.get("topic")
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check your inputs.";
    return { ok: false, error: msg };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Never log raw IP; hash it so we can detect abuse patterns without
  // storing PII.
  const ipHash = createHash("sha256")
    .update(`${ipHeader}|${process.env.NEXTAUTH_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 32);

  const record = await prisma.contactMessage.create({
    data: {
      topic: parsed.data.topic as Prisma.ContactMessageCreateInput["topic"],
      name:    parsed.data.name,
      email:   parsed.data.email,
      subject: parsed.data.subject,
      body:    parsed.data.body,
      userId,
      ipHash
    }
  });

  log.info("contact message received", {
    id: record.id,
    topic: record.topic,
    email: record.email,
    userId
  });

  // Best-effort email notification to the inbox associated with the
  // topic. In dev (no EMAIL_SERVER) this logs the envelope and
  // returns {simulated:true}. Never blocks the success response.
  try {
    const topic = TOPICS.find((t) => t.key === record.topic);
    if (topic) {
      await sendEmail({
        to: brandEmail(topic.inbox),
        subject: `[${topic.label}] ${record.subject}`,
        replyTo: record.email,
        text: [
          `From: ${record.name} <${record.email}>`,
          userId ? `User: ${userId}` : "",
          `Topic: ${topic.label}`,
          "",
          record.body,
          "",
          `— sent via /contact at ${record.createdAt.toISOString()}`,
          `Reference: ${record.id}`
        ].filter(Boolean).join("\n")
      });
    }
  } catch (err) {
    // Surface the error to logs but treat the submission as a
    // success — the row is safely persisted regardless.
    log.error("contact email send failed", {
      id: record.id,
      err: err instanceof Error ? err.message : String(err)
    });
  }

  return { ok: true };
}

export default async function ContactPage({
  searchParams
}: {
  searchParams?: { topic?: string };
}) {
  // Honor both the new enum values and the old lowercase slugs from
  // existing in-app links (e.g. /contact?topic=premium).
  const raw = (searchParams?.topic ?? "").trim();
  const initialTopic: TopicKey =
    TOPIC_KEYS.has(raw.toUpperCase())        ? (raw.toUpperCase() as TopicKey) :
    LEGACY_TOPIC_ALIAS[raw.toLowerCase()]    ? LEGACY_TOPIC_ALIAS[raw.toLowerCase()] :
                                               "OTHER";

  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { name: true, email: true }
      })
    : null;

  const activeTopic = TOPICS.find((t) => t.key === initialTopic);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">Contact</div>
      <h1 className="mt-2 font-display text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-nile-900 tracking-tight leading-[1.05]">
        Get in touch
      </h1>
      <p className="mt-3 text-[15px] text-ink-600 leading-relaxed max-w-lg">
        We read everything. Send a message below or reach the right inbox directly — we&rsquo;ll reply within two business days.
      </p>

      {activeTopic && initialTopic !== "OTHER" && (
        <div role="status" className="mt-8 rounded-md border border-nile-100 bg-nile-50 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-nile">
            You&apos;re writing about {activeTopic.label}
          </div>
          <p className="mt-2 text-[14px] text-ink-800 leading-relaxed">{activeTopic.blurb}</p>
        </div>
      )}

      <div className="mt-8">
        <ContactForm
          action={submitContactMessage}
          topics={TOPICS.map((t) => ({ key: t.key, label: t.label }))}
          initialTopic={initialTopic}
          initialName={me?.name ?? ""}
          initialEmail={me?.email ?? ""}
          signedIn={!!me}
        />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card
          label="Support"
          body="Problem with a ticket, event, or payment? This is the fastest route."
          email={brandEmail("help")}
        />
        <Card
          label="Partnerships"
          body="Churches, cultural associations, venues, media, telcos — we want to hear from you."
          email={brandEmail("partnerships")}
        />
        <Card
          label="Press"
          body="Story ideas, quotes, background briefings."
          email={brandEmail("press")}
        />
        <Card
          label="Trust & safety"
          body="Report an event, an organizer, or a safety concern. Confidential."
          email={brandEmail("trust")}
        />
      </div>

      <div className="mt-10 card p-6">
        <h2 className="font-display text-[18px] font-bold text-nile-900">Before you write</h2>
        <ul className="mt-3 text-[14px] text-ink-700 leading-relaxed space-y-2">
          <li>— Ticket problem? Check the <Link href="/tickets" className="text-nile hover:underline">My tickets</Link> page first; the backup code works even offline.</li>
          <li>— Event cancelled? Refunds are automatic and can take 2–7 business days on cards, minutes on mobile money.</li>
          <li>— Most common questions are in the <Link href="/help" className="text-nile hover:underline">help center</Link>.</li>
        </ul>
      </div>
    </div>
  );
}

function Card({ label, body, email }: { label: string; body: string; email: string }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <p className="mt-2 text-[14px] text-ink-700 leading-relaxed">{body}</p>
      <a href={`mailto:${email}`} className="mt-3 inline-block text-[14px] font-semibold text-nile hover:underline">
        {email}
      </a>
    </div>
  );
}
