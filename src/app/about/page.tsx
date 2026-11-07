import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { BRAND_NAME } from "@/lib/brand";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `About ${BRAND_NAME}`,
  description: `The team and mission behind ${BRAND_NAME} — a ticketing and community platform for every culture and community, everywhere.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${BRAND_NAME}`,
    description: `The team and mission behind ${BRAND_NAME}.`,
    type: "website"
  }
};

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
        About
      </div>
      <h1 className="mt-2 font-display text-[32px] sm:text-4xl lg:text-5xl tracking-tight leading-[1.05]">
        <Logo variant="stacked" size={200} href={null} />
      </h1>
      <div className="mt-6 space-y-4 text-[16px] leading-[1.7] text-ink-700">
        <p>
          {BRAND_NAME} is a home for every culture and community —
          a place to find, host, and share the events that connect people,
          wherever in the world they gather. Cultural associations, faith
          groups, alumni networks, youth leagues, families, neighbourhoods.
          If you have people worth gathering, this is for you.
        </p>
        <p>
          We believe tickets should be simple, payments should work everywhere
          (Lagos to London, Seoul to São Paulo), and every culture deserves
          infrastructure as warm as its gatherings.
        </p>
      </div>
    </div>
  );
}
