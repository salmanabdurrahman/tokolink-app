export type AnalyticsEvent =
  | "storefront_share_click"
  | "product_select"
  | "checkout_start"
  | "whatsapp_contact_click";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tokolink:analytics", { detail: { event, properties } }));
}
