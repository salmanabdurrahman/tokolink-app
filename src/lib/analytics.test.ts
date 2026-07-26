import { afterEach, describe, expect, it, vi } from "vitest";

const recordAnalyticsEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));
vi.mock("../server/analytics.functions", () => ({ recordAnalyticsEvent }));

import { trackEvent } from "./analytics";

describe("trackEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("dispatches a tokolink:analytics custom event with event and properties", () => {
    const listener = vi.fn();
    window.addEventListener("tokolink:analytics", listener);

    trackEvent("product_click", { productId: "product-1" });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      event: "product_click",
      properties: { productId: "product-1" },
    });

    window.removeEventListener("tokolink:analytics", listener);
  });

  it("defaults properties to an empty object", () => {
    const listener = vi.fn();
    window.addEventListener("tokolink:analytics", listener);

    trackEvent("checkout_started");

    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ event: "checkout_started", properties: {} });

    window.removeEventListener("tokolink:analytics", listener);
  });

  it("does nothing when window is undefined", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate server environment
    delete globalThis.window;

    expect(() => trackEvent("whatsapp_click")).not.toThrow();

    globalThis.window = originalWindow;
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("persists product_click/checkout_started/whatsapp_click when tenantSlug is provided", () => {
    trackEvent("product_click", { tenantSlug: "kopi-nusantara", productId: "product-1" });

    expect(recordAnalyticsEvent).toHaveBeenCalledWith({
      data: { tenantSlug: "kopi-nusantara", event: "product_click" },
    });
  });

  it("does not persist when tenantSlug is missing", () => {
    trackEvent("checkout_started");

    expect(recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("does not persist storefront_share_click (unrelated to the funnel)", () => {
    trackEvent("storefront_share_click", { tenantSlug: "kopi-nusantara" });

    expect(recordAnalyticsEvent).not.toHaveBeenCalled();
  });
});
