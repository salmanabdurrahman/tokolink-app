import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

function mockMatchMedia() {
  const listeners = new Set<() => void>();
  const mql = {
    matches: false,
    media: "",
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
    dispatchEvent: vi.fn(),
  };

  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

  return { mql, fire: () => listeners.forEach((listener) => listener()) };
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
    window.matchMedia = originalMatchMedia;
  });

  it("returns false for desktop width", () => {
    mockMatchMedia();
    setInnerWidth(1280);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("returns true for mobile width", () => {
    mockMatchMedia();
    setInnerWidth(375);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("updates when matchMedia change fires", () => {
    const { fire } = mockMatchMedia();
    setInnerWidth(1280);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setInnerWidth(375);
    act(() => fire());

    expect(result.current).toBe(true);
  });

  it("unsubscribes matchMedia listener on unmount", () => {
    const { mql } = mockMatchMedia();
    setInnerWidth(1280);

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
