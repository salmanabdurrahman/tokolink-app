import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function cleanDom() {
  document.body.innerHTML = "";
  document.head
    .querySelectorAll('script[src^="https://challenges.cloudflare.com/turnstile"]')
    .forEach((el) => el.remove());
}

describe("turnstile client helper", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanDom();
    delete window.turnstile;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    cleanDom();
    delete window.turnstile;
  });

  it("returns a disabled token when site key is missing", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getTurnstileToken } = await import("./turnstile");

    await expect(getTurnstileToken("signup")).resolves.toBe("disabled");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("renders an invisible widget, executes it, and resolves with the callback token", async () => {
    const render = vi.fn((_container: HTMLElement, options: { callback?: (t: string) => void }) => {
      queueMicrotask(() => options.callback?.("token-abc"));
      return "widget-1";
    });
    const execute = vi.fn();
    const reset = vi.fn();
    window.turnstile = { render, execute, reset };

    const { getTurnstileToken } = await import("./turnstile");

    await expect(getTurnstileToken("signup")).resolves.toBe("token-abc");
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0][1]).toMatchObject({
      size: "invisible",
      action: "signup",
    });
    expect(execute).toHaveBeenCalledWith("widget-1");
  });

  it("rejects and resets the widget when Turnstile reports an error", async () => {
    const render = vi.fn((_container: HTMLElement, options: { "error-callback"?: () => void }) => {
      queueMicrotask(() => options["error-callback"]?.());
      return "widget-1";
    });
    const execute = vi.fn();
    const reset = vi.fn();
    window.turnstile = { render, execute, reset };

    const { getTurnstileToken } = await import("./turnstile");

    await expect(getTurnstileToken("signup")).rejects.toThrow(
      "Verifikasi Turnstile gagal. Silakan coba lagi.",
    );
    expect(reset).toHaveBeenCalledWith("widget-1");
  });

  it("rejects when Turnstile token expires", async () => {
    const render = vi.fn(
      (_container: HTMLElement, options: { "expired-callback"?: () => void }) => {
        queueMicrotask(() => options["expired-callback"]?.());
        return "widget-1";
      },
    );
    const execute = vi.fn();
    const reset = vi.fn();
    window.turnstile = { render, execute, reset };

    const { getTurnstileToken } = await import("./turnstile");

    await expect(getTurnstileToken("signup")).rejects.toThrow(
      "Verifikasi Turnstile kedaluwarsa. Silakan coba lagi.",
    );
  });

  it("reuses the existing widget for a second call with the same action", async () => {
    const render = vi.fn((_container: HTMLElement, options: { callback?: (t: string) => void }) => {
      queueMicrotask(() => options.callback?.("token-first"));
      return "widget-1";
    });
    const execute = vi.fn();
    const reset = vi.fn();
    window.turnstile = { render, execute, reset };

    const { getTurnstileToken } = await import("./turnstile");
    await expect(getTurnstileToken("signup")).resolves.toBe("token-first");

    // second call with the same action reuses the widget instead of re-rendering
    void getTurnstileToken("signup");
    await Promise.resolve();

    expect(render).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith("widget-1");
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("removes and re-renders the widget when the action changes", async () => {
    let callCount = 0;
    const render = vi.fn((_container: HTMLElement, options: { callback?: (t: string) => void }) => {
      callCount += 1;
      const id = `widget-${callCount}`;
      queueMicrotask(() => options.callback?.(`token-${callCount}`));
      return id;
    });
    const execute = vi.fn();
    const reset = vi.fn();
    const remove = vi.fn();
    window.turnstile = { render, execute, reset, remove };

    const { getTurnstileToken } = await import("./turnstile");
    await expect(getTurnstileToken("signup")).resolves.toBe("token-1");
    await expect(getTurnstileToken("resend_signup_code")).resolves.toBe("token-2");

    expect(render).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith("widget-1");
  });

  it("rejects and resets when turnstile.render throws synchronously", async () => {
    const render = vi.fn(() => {
      throw new Error("render exploded");
    });
    const reset = vi.fn();
    window.turnstile = { render, execute: vi.fn(), reset };

    const { getTurnstileToken } = await import("./turnstile");

    await expect(getTurnstileToken("signup")).rejects.toThrow(
      "Turnstile gagal dijalankan. Silakan coba lagi.",
    );
  });

  it("resetTurnstileWidget does nothing when there is no active widget", async () => {
    const { resetTurnstileWidget } = await import("./turnstile");

    expect(() => resetTurnstileWidget()).not.toThrow();
  });

  it("loads the Turnstile script by appending it to the document head, then renders", async () => {
    const render = vi.fn((_container: HTMLElement, options: { callback?: (t: string) => void }) => {
      queueMicrotask(() => options.callback?.("token-loaded"));
      return "widget-1";
    });
    const execute = vi.fn();

    const { getTurnstileToken } = await import("./turnstile");
    const tokenPromise = getTurnstileToken("signup");

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    expect(script).not.toBeNull();

    window.turnstile = { render, execute, reset: vi.fn() };
    script?.onload?.(new Event("load"));

    await expect(tokenPromise).resolves.toBe("token-loaded");
  });

  it("rejects when the Turnstile script fails to load", async () => {
    const { getTurnstileToken } = await import("./turnstile");
    const tokenPromise = getTurnstileToken("signup");

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    script?.onerror?.(new Event("error"));

    await expect(tokenPromise).rejects.toThrow("Turnstile script gagal dimuat");
  });

  it("rejects when an already-present script tag fails to load", async () => {
    const existing = document.createElement("script");
    existing.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    document.head.appendChild(existing);

    const { getTurnstileToken } = await import("./turnstile");
    const tokenPromise = getTurnstileToken("signup");

    existing.dispatchEvent(new Event("error"));

    await expect(tokenPromise).rejects.toThrow("Turnstile script gagal dimuat");
  });

  it("throws when the script loads but window.turnstile never becomes available", async () => {
    const { getTurnstileToken } = await import("./turnstile");
    const tokenPromise = getTurnstileToken("signup");

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    script?.onload?.(new Event("load"));

    await expect(tokenPromise).rejects.toThrow("Turnstile belum siap. Silakan coba lagi.");
  });

  it("reuses an existing script tag already present in the document", async () => {
    const existing = document.createElement("script");
    existing.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    document.head.appendChild(existing);

    const render = vi.fn((_container: HTMLElement, options: { callback?: (t: string) => void }) => {
      queueMicrotask(() => options.callback?.("token-existing"));
      return "widget-1";
    });
    window.turnstile = { render, execute: vi.fn(), reset: vi.fn() };

    const { getTurnstileToken } = await import("./turnstile");
    const tokenPromise = getTurnstileToken("signup");

    existing.dispatchEvent(new Event("load"));

    await expect(tokenPromise).resolves.toBe("token-existing");
  });

  it("shares a single in-flight script load promise across concurrent calls", async () => {
    // Second call uses a different action than the first: a same-action concurrent
    // second call would reuse the first call's widget/callback bindings (a separate,
    // pre-existing limitation of the reuse path unrelated to script-load sharing), so
    // this test isolates what it actually verifies - that both calls await the same
    // in-flight <script> load rather than injecting a duplicate tag.
    let callCount = 0;
    const render = vi.fn((_container: HTMLElement, options: { callback?: (t: string) => void }) => {
      callCount += 1;
      const token = callCount === 1 ? "token-shared-a" : "token-shared-b";
      queueMicrotask(() => options.callback?.(token));
      return `widget-${callCount}`;
    });

    const { getTurnstileToken } = await import("./turnstile");
    const first = getTurnstileToken("signup");
    const second = getTurnstileToken("resend_signup_code");

    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    expect(scripts).toHaveLength(1);

    window.turnstile = { render, execute: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    scripts[0].onload?.(new Event("load"));

    await expect(first).resolves.toBe("token-shared-a");
    await expect(second).resolves.toBe("token-shared-b");
  });

  it("rejects when script load exceeds the timeout", async () => {
    vi.useFakeTimers();
    const { getTurnstileToken } = await import("./turnstile");

    const tokenPromise = getTurnstileToken("signup");
    const assertion = expect(tokenPromise).rejects.toThrow("Turnstile script load timeout");

    await vi.advanceTimersByTimeAsync(10_001);
    await assertion;
  });
});
