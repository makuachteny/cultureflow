/**
 * Public surface for the payments subsystem. Routes / actions should only
 * import from `@/lib/payments`, never from a specific provider file —
 * that way a future provider swap doesn't ripple across the codebase.
 */

export type {
  PaymentProvider,
  PaymentInitiation,
  ChargeParams,
  RefundParams,
  RefundResult,
  NormalisedEvent
} from "./types";

export { getProvider, pickProvider, enabledProviders } from "./router";
export { finaliseProviderEvent }                       from "./finalise";

// Re-exported tiny helpers — handy for the checkout UI's MSISDN field.
export { normaliseKenyanMsisdn }       from "./mpesa";
export { normaliseMomoPhone }          from "./momo";
export { normaliseSouthSudanPhone }    from "./mgurush";
