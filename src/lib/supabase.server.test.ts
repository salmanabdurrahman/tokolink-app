// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup (src/test/setup.ts) mocks "@/lib/supabase.server" for
// every test file. This file exists to test the real module, so we explicitly
// unmock it before each dynamic import.
vi.unmock("@/lib/supabase.server");
vi.unmock("./supabase.server");

describe("supabase.server (admin client)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a real Supabase admin client when the project URL is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://fake-project.supabase.co");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key");

    const { supabaseAdmin } = await import("./supabase.server");

    // The dummy fallback only stubs admin.createUser/updateUserById/deleteUser and
    // top-level getUser; a real client also exposes admin.listUsers, which is what
    // distinguishes it here.
    expect(typeof supabaseAdmin.auth.admin.listUsers).toBe("function");
  });

  it("falls back to the legacy SUPABASE_URL env var when VITE_SUPABASE_URL is unset", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "https://legacy-fake-project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { supabaseAdmin } = await import("./supabase.server");

    expect(warnSpy).not.toHaveBeenCalled();
    expect(typeof supabaseAdmin.auth.admin.listUsers).toBe("function");
  });

  it("falls back to a dummy admin client and warns when no Supabase URL is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { supabaseAdmin } = await import("./supabase.server");

    expect(warnSpy).toHaveBeenCalledWith(
      "Warning: Supabase URL is not defined on the server side.",
    );

    const createUserResult = await supabaseAdmin.auth.admin.createUser();
    expect(createUserResult.data).toEqual({ user: null });
    expect(createUserResult.error).toBeInstanceOf(Error);
    expect(createUserResult.error?.message).toBe("Supabase is not configured.");

    const updateUserResult = await supabaseAdmin.auth.admin.updateUserById();
    expect(updateUserResult.data).toEqual({ user: null });
    expect(updateUserResult.error).toBeInstanceOf(Error);

    const deleteUserResult = await supabaseAdmin.auth.admin.deleteUser();
    expect(deleteUserResult.error).toBeInstanceOf(Error);

    const getUserResult = await supabaseAdmin.auth.getUser();
    expect(getUserResult.data).toEqual({ user: null });
    expect(getUserResult.error).toBeInstanceOf(Error);
  });
});
