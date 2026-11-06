import PageTitle from "../_parts/PageTitle";
import InfoBanner from "../_parts/InfoBanner";

export default function WebhooksPage() {
  return (
    <>
      <PageTitle>Webhooks</PageTitle>
      <p className="mb-5 max-w-2xl text-[14px] text-ink-700">
        Subscribe to platform events (order created, ticket issued, refund
        approved) and receive HTTPS callbacks to your own endpoint.
      </p>
      <InfoBanner>
        Webhooks ship alongside the developer API. Request early access
        from the contact page and we&apos;ll reach out.
      </InfoBanner>
    </>
  );
}
