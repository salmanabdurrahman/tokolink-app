import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("error-capture", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers window error and unhandledrejection listeners on import", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./error-capture");

    expect(addEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });

  it("returns undefined when nothing captured yet", async () => {
    const { consumeLastCapturedError } = await import("./error-capture");

    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures window error event and consumes it once", async () => {
    const { consumeLastCapturedError } = await import("./error-capture");
    const error = new Error("boom");

    window.dispatchEvent(new ErrorEvent("error", { error }));

    expect(consumeLastCapturedError()).toBe(error);
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures unhandledrejection reason", async () => {
    const { consumeLastCapturedError } = await import("./error-capture");
    const reason = new Error("rejected");
    const event = new Event("unhandledrejection") as PromiseRejectionEvent & {
      reason?: unknown;
    };
    Object.defineProperty(event, "reason", { value: reason });

    window.dispatchEvent(event);

    expect(consumeLastCapturedError()).toBe(reason);
  });

  it("expires captured error after TTL", async () => {
    vi.useFakeTimers();
    const { consumeLastCapturedError } = await import("./error-capture");
    const error = new Error("stale");

    window.dispatchEvent(new ErrorEvent("error", { error }));
    vi.advanceTimersByTime(5_001);

    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
