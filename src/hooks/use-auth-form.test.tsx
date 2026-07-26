import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());
const registerUser = vi.hoisted(() => vi.fn());
const verifySignUpCode = vi.hoisted(() => vi.fn());
const resendSignUpCode = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/server/auth.functions", () => ({
  registerUser,
  verifySignUpCode,
  resendSignUpCode,
}));

import { useAuth } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useAuthForm } from "./use-auth-form";

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent;
}

describe("useAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useAuth.setState({ user: null, isLoading: false });
  });

  it("redirects to dashboard when user has a tenant", async () => {
    useAuth.setState({ user: { id: "user-1", tenant: { id: "tenant-1" } }, isLoading: false });

    renderHook(() => useAuthForm());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/dashboard" }));
  });

  it("redirects to onboarding when user has no tenant", async () => {
    useAuth.setState({ user: { id: "user-1", tenant: null }, isLoading: false });

    renderHook(() => useAuthForm());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/onboarding" }));
  });

  it("does not navigate when there is no user", () => {
    renderHook(() => useAuthForm());

    expect(navigate).not.toHaveBeenCalled();
  });

  it("ignores submitCredentials when email or password is missing", async () => {
    const { result } = renderHook(() => useAuthForm());

    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });

    expect(registerUser).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("signs up, switches to otp mode, and starts cooldown on success", async () => {
    registerUser.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("secret123");
    });

    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });

    expect(registerUser).toHaveBeenCalledWith({
      data: { email: "merchant@tokolink.test", password: "secret123" },
    });
    expect(result.current.mode).toBe("otp");
    expect(result.current.cooldown).toBe(60);
    expect(result.current.loading).toBe(false);
  });

  it("sets error message when signup fails", async () => {
    registerUser.mockRejectedValue(new Error("Email sudah terdaftar"));
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("secret123");
    });

    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });

    expect(result.current.error).toBe("Email sudah terdaftar");
    expect(result.current.loading).toBe(false);
  });

  it("signs in with password when mode is signin", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    } as never);
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setMode("signin");
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("secret123");
    });

    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "merchant@tokolink.test",
      password: "secret123",
    });
    expect(result.current.error).toBe("");
  });

  it("surfaces signin error from Supabase", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error("Kredensial salah"),
    } as never);
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setMode("signin");
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("wrong");
    });

    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });

    expect(result.current.error).toBe("Kredensial salah");
  });

  it("ignores verifyCode when code is not 6 digits", async () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => result.current.setCode("123"));

    await act(async () => {
      await result.current.verifyCode(submitEvent());
    });

    expect(verifySignUpCode).not.toHaveBeenCalled();
  });

  it("verifies otp code and signs in on success", async () => {
    verifySignUpCode.mockResolvedValue({ success: true });
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    } as never);
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("secret123");
      result.current.setCode("123456");
    });

    await act(async () => {
      await result.current.verifyCode(submitEvent());
    });

    expect(verifySignUpCode).toHaveBeenCalledWith({
      data: { email: "merchant@tokolink.test", code: "123456" },
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
  });

  it("sets error message when otp verification fails", async () => {
    verifySignUpCode.mockRejectedValue(new Error("Kode salah"));
    const { result } = renderHook(() => useAuthForm());

    act(() => result.current.setCode("123456"));

    await act(async () => {
      await result.current.verifyCode(submitEvent());
    });

    expect(result.current.error).toBe("Kode salah");
  });

  it("does not resend code while cooldown is active", async () => {
    registerUser.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("secret123");
    });
    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });
    expect(result.current.cooldown).toBe(60);

    await act(async () => {
      await result.current.resendCode();
    });

    expect(resendSignUpCode).not.toHaveBeenCalled();
  });

  it("resends code and resets cooldown/code on success", async () => {
    resendSignUpCode.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuthForm());

    act(() => result.current.setCode("111111"));

    await act(async () => {
      await result.current.resendCode();
    });

    expect(resendSignUpCode).toHaveBeenCalled();
    expect(result.current.cooldown).toBe(60);
    expect(result.current.code).toBe("");
  });

  it("sets error message when resend fails", async () => {
    resendSignUpCode.mockRejectedValue(new Error("Gagal mengirim ulang"));
    const { result } = renderHook(() => useAuthForm());

    await act(async () => {
      await result.current.resendCode();
    });

    expect(result.current.error).toBe("Gagal mengirim ulang");
  });

  it("counts cooldown down every second", async () => {
    vi.useFakeTimers();
    registerUser.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail("merchant@tokolink.test");
      result.current.setPassword("secret123");
    });
    await act(async () => {
      await result.current.submitCredentials(submitEvent());
    });
    expect(result.current.cooldown).toBe(60);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.cooldown).toBe(59);
    vi.useRealTimers();
  });

  it("signs in with Google OAuth", async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: "google", url: "https://example.com" },
      error: null,
    } as never);
    const { result } = renderHook(() => useAuthForm());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    expect(result.current.error).toBe("");
  });

  it("sets error and stops loading when Google OAuth fails", async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: "google", url: null },
      error: new Error("Gagal login Google"),
    } as never);
    const { result } = renderHook(() => useAuthForm());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.error).toBe("Gagal login Google");
    expect(result.current.loading).toBe(false);
  });
});
