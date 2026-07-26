import { recordAnalyticsEvent } from "@/server/analytics.functions";

export type AnalyticsEvent =
  | "storefront_share_click"
  | "storefront_view"
  | "product_click"
  | "checkout_started"
  | "payment_completed"
  | "whatsapp_click";

// Funnel events that get persisted to AnalyticsDaily when fired from a
// client component. storefront_share_click is unrelated to the merchant
// funnel and stays a client-only signal. storefront_view is recorded
// directly from the storefront loader (not through trackEvent), and
// payment_completed is recorded directly from the trusted Pakasir webhook
// flow, so neither goes through this client path.
const PERSISTED_CLIENT_EVENTS = ["product_click", "checkout_started", "whatsapp_click"] as const;
type PersistedClientEvent = (typeof PERSISTED_CLIENT_EVENTS)[number];

function isPersistedClientEvent(event: AnalyticsEvent): event is PersistedClientEvent {
  return (PERSISTED_CLIENT_EVENTS as readonly string[]).includes(event);
}

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tokolink:analytics", { detail: { event, properties } }));

  const tenantSlug = properties.tenantSlug;
  if (isPersistedClientEvent(event) && typeof tenantSlug === "string" && tenantSlug) {
    recordAnalyticsEvent({ data: { tenantSlug, event } }).catch(() => {
      // Analytics must never break the storefront/checkout flow.
    });
  }
}
