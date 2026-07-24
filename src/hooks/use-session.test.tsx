import { renderHook, waitFor } from "@testing-library/react";
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

  it("subscribes then unsubscribes from auth changes", () => {
    const unsubscribe = vi.fn();
    onAuthStateChange.mockReturnValueOnce({ data: { subscription: { unsubscribe } } });

    const { unmount } = renderHook(() => useSession());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
