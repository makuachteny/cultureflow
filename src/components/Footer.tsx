import Link from "next/link";
import Logo from "@/components/Logo";
import { FEATURED_CITIES, CATEGORIES } from "@/lib/taxonomy";
import { copyrightLine } from "@/lib/brand";

/**
 * Site footer.
 *
 * Reversed (white) logo lockup on black. The link
 * directory is a 2-column grid on mobile (so Cities/Categories sit on
 * one row and Platform/Support sit on the next), then a 5-column row at
 * md+. This collapses ~30 stacked rows on mobile down to a 4-row block.
 */
export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div aria-hidden className="beads beads-lg" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-12 grid gap-x-6 gap-y-5 grid-cols-2 md:grid-cols-5 text-[13px]">
        <div className="col-span-2 md:col-span-1">
          <Logo variant="horizontal" tone="white" size={52} />
          <p className="mt-3 hidden md:block text-white/75 max-w-xs text-[13px] leading-snug">
            Events for South Sudanese, at home and across the diaspora.
          </p>
        </div>

        <FooterCol title="Cities">
          {FEATURED_CITIES.slice(0, 4).map((c) => (
            <li key={c.slug}>
              <Link href={`/events/city/${c.slug}`} className="hover:text-gold">{c.label}</Link>
            </li>
          ))}
          <li><Link href="/browse" className="hover:text-gold font-semibold">All events →</Link></li>
        </FooterCol>

        <FooterCol title="Categories">
          {CATEGORIES.slice(0, 4).map((c) => (
            <li key={c.slug}>
              <Link href={`/events/category/${c.slug}`} className="hover:text-gold">{c.label}</Link>
            </li>
          ))}
        </FooterCol>

        <FooterCol title="Platform">
          <li><Link href="/how-it-works" className="hover:text-gold">How it works</Link></li>
          <li><Link href="/for-organizers" className="hover:text-gold">For organizers</Link></li>
          <li><Link href="/pricing" className="hover:text-gold">Pricing</Link></li>
          <li><Link href="/events/new" className="hover:text-gold">Create event</Link></li>
        </FooterCol>

        <FooterCol title="Support">
          <li><Link href="/help" className="hover:text-gold">Help Center</Link></li>
          <li><Link href="/contact" className="hover:text-gold">Contact us</Link></li>
          <li><Link href="/about" className="hover:text-gold">About</Link></li>
        </FooterCol>
      </div>

      <div className="border-t-2 border-white/20 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px] text-white/65">
          <div>{copyrightLine()}</div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/legal/terms" className="hover:text-gold">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-gold">Privacy</Link>
            <Link href="/legal/refunds" className="hover:text-gold">Refunds</Link>
            <Link href="/credits" className="hover:text-gold">Credits</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="inline-block bg-gold text-ink px-1.5 py-0.5 text-[12px] font-bold">{title}</h4>
      <ul className="mt-3 space-y-1.5 text-[13.5px] text-white/85">{children}</ul>
    </div>
  );
}
