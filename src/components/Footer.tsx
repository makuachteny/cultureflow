import Link from "next/link";
import { FEATURED_CITIES, CATEGORIES } from "@/lib/taxonomy";
import { BRAND_HOME_LABEL, BRAND_NAME, copyrightLine } from "@/lib/brand";

/**
 * Site footer.
 *
 * Wordmark only — no buffalo mark — to keep the chrome quiet. The link
 * directory is a 2-column grid on mobile (so Cities/Categories sit on
 * one row and Platform/Support sit on the next), then a 5-column row at
 * md+. This collapses ~30 stacked rows on mobile down to a 4-row block.
 */
export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[color:var(--border-hairline)] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-7 grid gap-x-6 gap-y-5 grid-cols-2 md:grid-cols-5 text-[13px]">
        <div className="col-span-2 md:col-span-1">
          <Link
            href="/"
            aria-label={BRAND_HOME_LABEL}
            className="inline-block font-display text-[18px] font-extrabold tracking-tight text-nile-900 leading-none hover:text-nile transition-colors"
          >
            {BRAND_NAME}
          </Link>
          <p className="mt-1.5 hidden md:block text-ink/70 max-w-xs text-[12.5px] leading-snug">
            Events for South Sudanese, at home and across the diaspora.
          </p>
        </div>

        <FooterCol title="Cities">
          {FEATURED_CITIES.slice(0, 4).map((c) => (
            <li key={c.slug}>
              <Link href={`/events/city/${c.slug}`} className="hover:text-nile">{c.label}</Link>
            </li>
          ))}
          <li><Link href="/browse" className="hover:text-nile font-semibold">All events →</Link></li>
        </FooterCol>

        <FooterCol title="Categories">
          {CATEGORIES.slice(0, 4).map((c) => (
            <li key={c.slug}>
              <Link href={`/events/category/${c.slug}`} className="hover:text-nile">{c.label}</Link>
            </li>
          ))}
        </FooterCol>

        <FooterCol title="Platform">
          <li><Link href="/how-it-works" className="hover:text-nile">How it works</Link></li>
          <li><Link href="/for-organizers" className="hover:text-nile">For organizers</Link></li>
          <li><Link href="/pricing" className="hover:text-nile">Pricing</Link></li>
          <li><Link href="/events/new" className="hover:text-nile">Create event</Link></li>
        </FooterCol>

        <FooterCol title="Support">
          <li><Link href="/help" className="hover:text-nile">Help Center</Link></li>
          <li><Link href="/contact" className="hover:text-nile">Contact us</Link></li>
          <li><Link href="/about" className="hover:text-nile">About</Link></li>
        </FooterCol>
      </div>

      <div className="border-t border-[color:var(--border-hairline)] py-2.5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] text-ink/60">
          <div>{copyrightLine()}</div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/legal/terms" className="hover:text-nile">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-nile">Privacy</Link>
            <Link href="/legal/refunds" className="hover:text-nile">Refunds</Link>
            <Link href="/credits" className="hover:text-nile">Credits</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-nile text-[12px] uppercase tracking-[0.08em]">{title}</h4>
      <ul className="mt-1.5 space-y-1 text-[13px] text-ink/80">{children}</ul>
    </div>
  );
}
