import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { BRAND_NAME } from "@/lib/brand";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `About ${BRAND_NAME}`,
  description: `The team and mission behind ${BRAND_NAME} — a ticketing and community platform built for South Sudanese, at home and across the diaspora.`,
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
          {BRAND_NAME} is the digital home for the South Sudanese community —
          a place to find, host, and share events that connect our people,
          wherever in the world they gather. Tribes, clans, churches,
          alumni networks, youth associations, families. If you call yourself
          South Sudanese, this is for you.
        </p>
        <p>
          We believe tickets should be simple, payments should work everywhere
          (Juba to Calgary), and our culture deserves infrastructure as warm as
          the gatherings themselves.
        </p>
      </div>
    </div>
  );
}
