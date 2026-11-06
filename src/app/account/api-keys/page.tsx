import PageTitle from "../_parts/PageTitle";
import InfoBanner from "../_parts/InfoBanner";

export default function ApiKeysPage() {
  return (
    <>
      <PageTitle>API Keys</PageTitle>
      <p className="mb-5 max-w-2xl text-[14px] text-ink-700">
        Personal access tokens for the public API. Use them to script
        event creation, pull your own orders, or build integrations on
        top of the platform.
      </p>
      <InfoBanner>
        The developer API isn&apos;t generally available yet. Request early
        access from the contact page and we&apos;ll reach out.
      </InfoBanner>
    </>
  );
}
