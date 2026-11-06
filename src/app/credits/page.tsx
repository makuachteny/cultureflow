/**
 * /credits — image attribution page.
 *
 * The community photos under /public/community/ include several CC-BY
 * and CC-BY-SA images sourced from Wikimedia Commons. Both licences
 * require visible attribution when the work is publicly displayed.
 *
 * This page reads `public/community/ATTRIBUTION.md` at build time and
 * renders one card per image. Replace any photo by dropping a new JPG
 * into /public/community/ — if the swap-commons-photos.mjs script
 * isn't re-run for that slot, that entry simply credits the prior
 * source (which is fine since the file actually came from Commons).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";

export const metadata = {
  title:       "Image credits",
  description: "Attribution for community photos used across CultureFlow."
};

type Entry = {
  slot:       string;
  fileTitle:  string;
  fileUrl:    string;
  author:     string;
  license:    string;
  credit?:    string;
};

async function readAttribution(): Promise<Entry[]> {
  const file = path.resolve(process.cwd(), "public/community/ATTRIBUTION.md");
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return [];
  }
  // Markdown structure (per the swap-commons-photos.mjs writer):
  //   ## <slot>.jpg
  //   - File:    [<title>](<url>)
  //   - Author:  <author>
  //   - License: <license>
  //   - Credit:  <credit>
  const blocks = raw.split(/^## /m).slice(1);
  return blocks.map((b) => {
    const lines = b.split("\n");
    const slot = lines[0].replace(/\.jpg$/, "").trim();
    const get = (k: string) => {
      const line = lines.find((l) => l.startsWith(`- ${k}:`));
      return line ? line.replace(`- ${k}:`, "").trim() : "";
    };
    const fileLine = get("File");
    const m = fileLine.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    return {
      slot,
      fileTitle: m?.[1] ?? fileLine,
      fileUrl:   m?.[2] ?? "",
      author:    get("Author"),
      license:   get("License"),
      credit:    get("Credit") || undefined
    };
  }).filter((e) => e.slot && e.fileTitle);
}

export default async function CreditsPage() {
  const entries = await readAttribution();

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <header className="mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-nile-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-nile">
          Attribution
        </span>
        <h1 className="mt-4 font-display text-[32px] sm:text-[40px] font-extrabold text-nile-900 tracking-tight leading-[1.05]">
          Image credits
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-700 leading-relaxed">
          Many of the community photos surfaced across CultureFlow come from
          Wikimedia Commons. We re-publish them here under their original
          Creative Commons or public-domain licences, with full credit to
          the photographers and to the Commons hosts that curate them.
        </p>
        <p className="mt-3 max-w-2xl text-[14px] text-ink-600">
          Each entry below names the source file, the author, and the licence.
          Click the file name to open the original on Wikimedia Commons.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-hairline)] bg-white p-8 text-center text-ink-600">
          <p>
            No third-party imagery is currently in use — every community
            photo is first-party.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {entries.map((e) => (
            <li key={e.slot} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[color:var(--border-hairline)]">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
                {e.slot}
              </div>
              <h2 className="mt-1.5 font-display text-[15.5px] font-bold text-nile-900 leading-snug">
                {e.fileUrl ? (
                  <Link href={e.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {e.fileTitle}
                  </Link>
                ) : e.fileTitle}
              </h2>
              <dl className="mt-3 space-y-1.5 text-[12.5px] text-ink-700">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-semibold text-ink-500">Author</dt>
                  <dd className="min-w-0">{e.author || "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-semibold text-ink-500">Licence</dt>
                  <dd>
                    <span className="rounded-md bg-cream-200 px-2 py-0.5 font-mono text-[11.5px] text-ink-800">
                      {e.license || "unknown"}
                    </span>
                  </dd>
                </div>
                {e.credit && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold text-ink-500">Credit</dt>
                    <dd className="min-w-0 text-ink-600 break-words">{e.credit}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 border-t border-[color:var(--border-hairline)] pt-6 text-[13px] text-ink-500">
        <p>
          If you spot a photo whose attribution we&rsquo;ve mis-named, or you&rsquo;d
          like a photo of your own community event added (with credit),{" "}
          <Link href="/contact" className="text-nile font-semibold hover:underline">
            get in touch
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
