import { brandEmail } from "@/lib/brand";
import PageTitle from "../_parts/PageTitle";

export default function PersonalDataPage() {
  const deletionMailto =
    `mailto:${brandEmail("privacy")}?subject=${encodeURIComponent("Data deletion request")}`;

  return (
    <>
      <PageTitle>Personal Data</PageTitle>
      <p className="mb-6 max-w-2xl text-[14px] text-ink-700">
        Download a copy of your data or request deletion under applicable
        privacy laws.
      </p>

      <div className="grid max-w-2xl gap-3">
        {/* Download is a real GET endpoint now — streams a JSON archive
            of the user's profile, orders, tickets, events, follows,
            likes, and comments. Never includes the password hash. */}
        <DataCard
          href="/api/account/export"
          title="Download my data"
          blurb="A JSON archive of your profile, orders, tickets, follows, likes, and comments. Downloads immediately."
          cta="Download"
        />
        {/* Deletion stays out-of-band via email. A programmatic
            self-serve flow requires more careful retention handling
            (tax records, paid-order history) and shouldn't ship until
            we have the legal-retention schema in place. */}
        <DataCard
          href={deletionMailto}
          title="Request data deletion"
          blurb="Permanently erase personal fields we can legally delete. Some records (receipts, tax documents) are retained per regulation."
          cta="Request deletion"
          danger
        />
      </div>
    </>
  );
}

function DataCard({
  href, title, blurb, cta, danger
}: {
  href: string; title: string; blurb: string; cta: string; danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-[color:var(--border-hairline)] bg-white p-4">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ink-900">{title}</div>
        <div className="text-[13px] text-ink-600">{blurb}</div>
      </div>
      <a href={href} className={"btn shrink-0 " + (danger ? "btn-danger" : "btn-ghost")}>
        {cta}
      </a>
    </div>
  );
}
