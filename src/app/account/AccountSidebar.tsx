"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * AccountSidebar — left nav for /account/*. Two collapsible groups
 * ("Account" and "Developer Links") with a left-border accent on the
 * active row. Active state uses the brand's nile blue.
 */

type Item = { href: string; label: string };

const ACCOUNT_ITEMS: Item[] = [
  { href: "/account/contact-info",              label: "Contact Info" },
  { href: "/account/organization",              label: "Organization" },
  { href: "/account/change-email",              label: "Change Email" },
  { href: "/account/password",                  label: "Password" },
  { href: "/account/credit-debit-cards",        label: "Credit/Debit Cards" },
  { href: "/account/linked-accounts",           label: "Linked Accounts" },
  { href: "/account/communication-preferences", label: "Communication Preferences" },
  { href: "/account/close-account",             label: "Close Account" },
  { href: "/account/personal-data",             label: "Personal Data" }
];

const DEV_ITEMS: Item[] = [
  { href: "/account/api-keys",    label: "API Keys" },
  { href: "/account/webhooks",    label: "Webhooks" }
];

export default function AccountSidebar() {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(true);
  const [devOpen, setDevOpen]         = useState(false);

  return (
    <nav aria-label="Account settings" className="w-full md:w-[260px] shrink-0">
      <Group
        label="Account"
        open={accountOpen}
        onToggle={() => setAccountOpen((v) => !v)}
      >
        {ACCOUNT_ITEMS.map((it) => (
          <Row key={it.href} item={it} active={pathname === it.href} />
        ))}
      </Group>

      <Group
        label="Developer Links"
        open={devOpen}
        onToggle={() => setDevOpen((v) => !v)}
      >
        {DEV_ITEMS.map((it) => (
          <Row key={it.href} item={it} active={pathname === it.href} />
        ))}
      </Group>
    </nav>
  );
}

function Group({
  label, open, onToggle, children
}: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[color:var(--border-hairline)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-4 text-[15px] font-bold text-ink-900 hover:bg-cream-100/50 transition-colors"
      >
        <span>{label}</span>
        <svg
          viewBox="0 0 24 24"
          className={"h-4 w-4 text-ink-600 transition-transform " + (open ? "" : "-rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      {open && <ul className="pb-2">{children}</ul>}
    </div>
  );
}

function Row({ item, active }: { item: Item; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={
          "block border-l-[3px] px-4 py-2.5 text-[14px] transition-colors " +
          (active
            ? "border-nile bg-nile-50/40 font-semibold text-ink-900"
            : "border-transparent text-ink-700 hover:bg-cream-100/60 hover:text-ink-900")
        }
      >
        {item.label}
      </Link>
    </li>
  );
}
