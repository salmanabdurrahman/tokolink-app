import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const onAuthStateChange = vi.hoisted(() => vi.fn());
const syncSession = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getSession, onAuthStateChange } },
}));
vi.mock("../server/auth.functions", () => ({ syncSession }));

import { useAuth } from "../lib/store";
import { useSession } from "./use-session";

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    useAuth.setState({ user: null, isLoading: true });
    syncSession.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it("clears auth state when session missing", async () => {
    renderHook(() => useSession());

    await waitFor(() => expect(useAuth.getState().isLoading).toBe(false));
    expect(useAuth.getState().user).toBeNull();
  });

  it("syncs Supabase session once and stores Prisma user", async () => {
    getSession.mockResolvedValueOnce({
      data: { session: { access_token: "token-1", expires_in: 3600 } },
      error: null,
    });

    renderHook(() => useSession());

    await waitFor(() => expect(syncSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useAuth.getState().user).toMatchObject({ id: "user-1" }));
    expect(document.cookie).toContain("sb-access-token=token-1");
  });

  it("refreshes routes after Prisma user sync", async () => {
    const onSessionSynced = vi.fn();
    getSession.mockResolvedValueOnce({
      data: { session: { access_token: "token-1", expires_in: 3600 } },
      error: null,
    });

    renderHook(() => useSession({ onSessionSynced }));

    await waitFor(() => expect(onSessionSynced).toHaveBeenCalledTimes(1));
    expect(useAuth.getState().user).toMatchObject({ id: "user-1" });
  });

  it("does not refresh routes when session is missing", async () => {
    const onSessionSynced = vi.fn();

    renderHook(() => useSession({ onSessionSynced }));

    await waitFor(() => expect(useAuth.getState().isLoading).toBe(false));
    expect(onSessionSynced).not.toHaveBeenCalled();
  });

  it("keeps synced user when route refresh fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const refreshError = new Error("refresh failed");
    const onSessionSynced = vi.fn().mockRejectedValueOnce(refreshError);
    getSession.mockResolvedValueOnce({
      data: { session: { access_token: "token-1", expires_in: 3600 } },
      error: null,
    });

    renderHook(() => useSession({ onSessionSynced }));

    await waitFor(() => expect(onSessionSynced).toHaveBeenCalledTimes(1));
    expect(useAuth.getState().user).toMatchObject({ id: "user-1" });
    expect(useAuth.getState().isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to refresh routes after session sync:",
      refreshError,
    );

    consoleSpy.mockRestore();
  });

  it("subscribes then unsubscribes from auth changes", () => {
    const unsubscribe = vi.fn();
    onAuthStateChange.mockReturnValueOnce({ data: { subscription: { unsubscribe } } });

    const { unmount } = renderHook(() => useSession());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it("resets user and logs error when Prisma sync fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onSessionSynced = vi.fn();
    syncSession.mockRejectedValueOnce(new Error("sync failed"));
    getSession.mockResolvedValueOnce({
      data: { session: { access_token: "token-fail", expires_in: 3600 } },
      error: null,
    });

    renderHook(() => useSession({ onSessionSynced }));

    await waitFor(() => expect(useAuth.getState().isLoading).toBe(false));
    expect(useAuth.getState().user).toBeNull();
    expect(onSessionSynced).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to sync session with Prisma:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("reuses the in-flight sync promise when the same token fires twice via auth changes", async () => {
    let resolveSync!: (user: unknown) => void;
    syncSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        }),
    );

    let authCallback: (event: string, session: unknown) => void = () => {};
    onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    renderHook(() => useSession());
    await waitFor(() => expect(onAuthStateChange).toHaveBeenCalled());

    const session = { access_token: "token-dup", expires_in: 3600 };
    act(() => {
      authCallback("SIGNED_IN", session);
      authCallback("SIGNED_IN", session);
    });

    expect(syncSession).toHaveBeenCalledTimes(1);

    resolveSync({ id: "user-dup" });
    await waitFor(() => expect(useAuth.getState().user).toMatchObject({ id: "user-dup" }));
  });
});
