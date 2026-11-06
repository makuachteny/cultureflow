"use client";

import { useRef, useState, useTransition } from "react";
import Field from "@/components/ui/Field";

/**
 * Contact form — client island inside the otherwise server-rendered
 * /contact page. Posts to `action`, which is a server action passed
 * in from the parent. Optimistic state lets the button swap to a
 * "Thanks — we'll reply within two business days" confirmation
 * without a round-trip to a separate page.
 *
 * Why pass the action in (vs. declaring it inside this file): keeps
 * the server-side Prisma + rate-limit + env imports out of the
 * client bundle. The parent route module owns those; we just own
 * the rendered <form>.
 */

type Topic = { key: string; label: string };

type Props = {
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  topics: Topic[];
  initialTopic: string;
  initialName: string;
  initialEmail: string;
  /** When the user is signed in, the email/name fields pre-fill and
   *  can be made read-only — the backend trusts the session anyway. */
  signedIn: boolean;
};

export default function ContactForm({
  action, topics, initialTopic, initialName, initialEmail, signedIn
}: Props) {
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, start]    = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    start(async () => {
      const res = await action(fd);
      if (res.ok) {
        setSent(true);
        form.reset();
      } else {
        setError(res.error);
      }
    });
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-lg border border-acacia-500/30 bg-acacia-500/5 p-6"
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-acacia-700">
          Thanks — message received
        </div>
        <h2 className="mt-2 font-display text-[20px] font-bold text-nile-900">
          We&apos;ll reply within two business days.
        </h2>
        <p className="mt-2 text-[14px] text-ink-700 leading-relaxed">
          If you need something urgent (ticket issue, day-of-event problem),
          the support inbox is the fastest path — it&apos;s in the card grid above.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="btn btn-ghost btn-sm mt-4"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="card p-6 sm:p-8 space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" required>
          <input
            name="name"
            defaultValue={initialName}
            readOnly={signedIn && !!initialName}
            maxLength={120}
            required
            className="input"
            autoComplete="name"
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            name="email"
            defaultValue={initialEmail}
            readOnly={signedIn && !!initialEmail}
            maxLength={200}
            required
            className="input"
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label="Topic">
        <select name="topic" defaultValue={initialTopic} className="input select">
          {topics.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Subject" required>
        <input
          name="subject"
          maxLength={140}
          required
          className="input"
          placeholder="One line that summarizes your message"
        />
      </Field>

      <Field
        label="Message"
        required
        hint="Be specific — paste ticket codes, order ids, or URLs that help us find your issue fast."
      >
        <textarea
          name="body"
          minLength={10}
          maxLength={5000}
          required
          rows={7}
          className="input textarea leading-relaxed"
          placeholder="What's going on?"
        />
      </Field>

      {error && (
        <div role="alert" className="rounded-md border border-hibiscus/30 bg-hibiscus/5 px-4 py-3 text-[13px] text-hibiscus">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-[12px] text-ink-500">
          By sending, you agree to be contacted at the email above.
        </p>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
