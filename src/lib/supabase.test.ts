import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup (src/test/setup.ts) mocks "@/lib/supabase" for every
// test file so consumers can stub auth calls easily. This file exists to test
// the real module, so we explicitly unmock it before each dynamic import.
vi.unmock("@/lib/supabase");
vi.unmock("./supabase");

describe("supabase (browser client)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a real Supabase client when VITE_SUPABASE_URL is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://fake-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "fake-anon-key");

    const { supabase } = await import("./supabase");

    // The dummy fallback only defines a small subset of auth methods; a real
    // client exposes the full surface (e.g. signUp), which is what we assert here.
    expect(typeof supabase.auth.signUp).toBe("function");
    expect(typeof supabase.auth.getSession).toBe("function");
  });

  it("falls back to a dummy client and warns when VITE_SUPABASE_URL is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { supabase } = await import("./supabase");

    expect(warnSpy).toHaveBeenCalledWith(
      "Warning: VITE_SUPABASE_URL is not defined in the environment.",
    );

    await expect(supabase.auth.getSession()).resolves.toEqual({
      data: { session: null },
      error: null,
    });

    const { data } = supabase.auth.onAuthStateChange(() => {});
    expect(() => data.subscription.unsubscribe()).not.toThrow();

    await expect(supabase.auth.signOut()).resolves.toEqual({ error: null });

    const signInResult = await supabase.auth.signInWithPassword();
    expect(signInResult.data).toEqual({ user: null, session: null });
    expect(signInResult.error).toBeInstanceOf(Error);
    expect(signInResult.error?.message).toBe("Supabase is not configured.");

    const oauthResult = await supabase.auth.signInWithOAuth();
    expect(oauthResult.data).toEqual({});
    expect(oauthResult.error).toBeInstanceOf(Error);
  });
});
