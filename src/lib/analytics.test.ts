import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

describe("trackEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches a tokolink:analytics custom event with event and properties", () => {
    const listener = vi.fn();
    window.addEventListener("tokolink:analytics", listener);

    trackEvent("product_select", { productId: "product-1" });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      event: "product_select",
      properties: { productId: "product-1" },
    });

    window.removeEventListener("tokolink:analytics", listener);
  });

  it("defaults properties to an empty object", () => {
    const listener = vi.fn();
    window.addEventListener("tokolink:analytics", listener);

    trackEvent("checkout_start");

    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ event: "checkout_start", properties: {} });

    window.removeEventListener("tokolink:analytics", listener);
  });

  it("does nothing when window is undefined", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate server environment
    delete globalThis.window;

    expect(() => trackEvent("whatsapp_contact_click")).not.toThrow();

    globalThis.window = originalWindow;
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
