import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

import { useAuth } from "../lib/store";
import { useAuthGuard } from "./use-auth-guard";

describe("useAuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.setState({ user: null, isLoading: true });
  });

  it("waits while auth is loading", () => {
    renderHook(() => useAuthGuard());

    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects guest to auth page", async () => {
    useAuth.setState({ user: null, isLoading: false });

    renderHook(() => useAuthGuard());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/auth" }));
  });

  it("redirects authenticated user without tenant to onboarding when required", async () => {
    useAuth.setState({ user: { id: "user-1", tenant: null }, isLoading: false });

    renderHook(() => useAuthGuard({ requireTenant: true }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/onboarding" }));
  });

  it("returns authenticated state without redirect when tenant exists", () => {
    const user = { id: "user-1", tenant: { id: "tenant-1" } };
    useAuth.setState({ user, isLoading: false });

    const { result } = renderHook(() => useAuthGuard({ requireTenant: true }));

    expect(result.current).toMatchObject({ user, isLoading: false, isAuthenticated: true });
    expect(navigate).not.toHaveBeenCalled();
  });
});
