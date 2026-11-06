"use client";

import { useMemo, useState } from "react";

/**
 * Email audience builder. Until we wire a real transactional email
 * provider, this panel lets the organizer: see their audience size,
 * download it as CSV, and compose a message via their own mail client
 * using a pre-filled mailto: link with BCC'd recipients (so attendees
 * never see each other's addresses).
 *
 * mailto: URLs have length limits in the wild (~2000 chars on many
 * clients), so we chunk the BCC list into multiple "Compose batch"
 * buttons when the audience is large.
 */

export default function EmailAudience({
  emails,
  followerCount,
  defaultSubject
}: {
  emails: string[];
  followerCount: number;
  defaultSubject: string;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(
    "Hi there,\n\nI wanted to share an update about our upcoming event.\n\n— "
  );
  const [copied, setCopied] = useState(false);

  const batches = useMemo(() => chunkForMailto(emails), [emails]);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <div>
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Audience</div>
          <div className="mt-2 font-display text-[28px] font-bold text-nile-900 font-tabular">
            {emails.length.toLocaleString()}
          </div>
          <div className="mt-1 text-[13px] text-ink-600">
            Past ticket-holders across your events
          </div>
          <div className="mt-4 border-t border-[color:var(--border-hairline)] pt-4">
            <div className="text-[13px] text-ink-600">
              + <span className="font-semibold text-nile font-tabular">{followerCount.toLocaleString()}</span> followers on your profile page
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <a href="/api/exports/attendees" download className="btn btn-outline justify-center">
            Download attendees CSV
          </a>
          <button type="button" onClick={copyAll} className="btn btn-ghost justify-center" disabled={emails.length === 0}>
            {copied ? "Copied ✓" : "Copy emails to clipboard"}
          </button>
        </div>

        <p className="mt-4 text-[12px] text-ink-500 leading-relaxed">
          Use your own email tool (Mailchimp, Gmail, Outlook) for the final send. A
          provider-integrated campaign builder lands in the next release.
        </p>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <label className="block">
            <span className="text-sm font-semibold text-ink mb-1 block">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              maxLength={140}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-ink mb-1 block">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input min-h-40 py-2"
              rows={8}
            />
          </label>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-nile-900">Compose in your mail client</div>
              <div className="text-[12px] text-ink-500">
                {batches.length === 0
                  ? "Add attendees to your events, and they'll show up here."
                  : batches.length === 1
                    ? `${emails.length} recipients · opens one draft`
                    : `${emails.length} recipients · split into ${batches.length} drafts for mail-client limits`}
              </div>
            </div>
            {batches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {batches.map((bcc, i) => (
                  <a
                    key={i}
                    href={`mailto:?bcc=${encodeURIComponent(bcc.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                    className="btn btn-primary btn-sm"
                  >
                    {batches.length === 1 ? "Compose" : `Batch ${i + 1}`}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Split recipient list so each mailto: URL stays under a safe budget.
 * We target ~1600 chars of encoded BCC — well under the 2048 floor most
 * clients honour, leaving room for subject + body.
 */
function chunkForMailto(emails: string[]): string[][] {
  const MAX = 1600;
  const out: string[][] = [];
  let bucket: string[] = [];
  let len = 0;
  for (const e of emails) {
    const add = (bucket.length > 0 ? 1 : 0) + encodeURIComponent(e).length;
    if (len + add > MAX && bucket.length > 0) {
      out.push(bucket);
      bucket = [];
      len = 0;
    }
    bucket.push(e);
    len += add;
  }
  if (bucket.length > 0) out.push(bucket);
  return out;
}
