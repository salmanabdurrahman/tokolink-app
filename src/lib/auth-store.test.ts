import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      signOut: signOutMock,
    },
  },
}));

import { useAuth } from "./auth-store";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuth.setState({ user: null, isLoading: true });
    });
  });

  afterEach(() => {
    act(() => {
      useAuth.setState({ user: null, isLoading: true });
    });
  });

  it("sets current user and loading state", () => {
    act(() => {
      useAuth.getState().setUser({ id: "user-1", email: "merchant@tokolink.test" });
      useAuth.getState().setLoading(false);
    });

    expect(useAuth.getState().user).toMatchObject({ id: "user-1" });
    expect(useAuth.getState().isLoading).toBe(false);
  });

  it("signs out from Supabase and clears current user", async () => {
    signOutMock.mockResolvedValue({ error: null });
    act(() => {
      useAuth.getState().setUser({ id: "user-1" });
    });

    await act(async () => {
      await useAuth.getState().signOut();
    });

    expect(signOutMock).toHaveBeenCalledOnce();
    expect(useAuth.getState().user).toBeNull();
  });
});
