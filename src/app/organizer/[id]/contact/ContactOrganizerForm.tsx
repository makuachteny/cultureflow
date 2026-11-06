"use client";

import { useRef, useState, useTransition } from "react";
import Field from "@/components/ui/Field";

/**
 * Direct-to-organizer contact form. Client island — the parent
 * route passes in a server action that does the rate-limit +
 * validation + persist step. Handles optimistic success UI and
 * inline error rendering without a full round-trip page nav.
 */

type Props = {
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  initialName: string;
  initialEmail: string;
  signedIn: boolean;
  organizerName: string;
};

export default function ContactOrganizerForm({
  action, initialName, initialEmail, signedIn, organizerName
}: Props) {
  const [sent, setSent]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start]  = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    start(async () => {
      const res = await action(fd);
      if (res.ok) { setSent(true); form.reset(); }
      else        { setError(res.error); }
    });
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-lg border border-acacia-500/30 bg-acacia-500/5 p-6"
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-acacia-700">
          Sent
        </div>
        <h2 className="mt-2 font-display text-[20px] font-bold text-nile-900">
          {organizerName} has your message.
        </h2>
        <p className="mt-2 text-[14px] text-ink-700 leading-relaxed">
          Expect a reply at <span className="font-semibold">{initialEmail || "the email you provided"}</span>.
          Organizers usually reply within a day or two.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="btn btn-ghost btn-sm mt-4"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card p-6 sm:p-8 space-y-5">
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

      <Field label="Subject" required>
        <input
          name="subject"
          maxLength={140}
          required
          className="input"
          placeholder={`Question about ${organizerName}`}
        />
      </Field>

      <Field
        label="Message"
        required
        hint="Be specific — reference a ticket code, event name, or date if relevant."
      >
        <textarea
          name="body"
          minLength={10}
          maxLength={5000}
          required
          rows={7}
          className="input textarea leading-relaxed"
          placeholder={`Hi ${organizerName.split(" ")[0] ?? "there"},`}
        />
      </Field>

      {error && (
        <div role="alert" className="rounded-md border border-hibiscus/30 bg-hibiscus/5 px-4 py-3 text-[13px] text-hibiscus">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-[12px] text-ink-500">
          Your message goes directly to {organizerName}. They see your name + email.
        </p>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
