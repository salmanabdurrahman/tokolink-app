import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store";

interface AuthGuardOptions {
  requireTenant?: boolean;
  redirectTo?: string;
}

export function useAuthGuard({ requireTenant = false, redirectTo }: AuthGuardOptions = {}) {
  const user = useAuth((s) => s.user);
  const isLoading = useAuth((s) => s.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate({ to: redirectTo ?? "/auth" });
    } else if (requireTenant && !user.tenant) {
      navigate({ to: "/onboarding" });
    }
  }, [user, isLoading, navigate, requireTenant, redirectTo]);

  return { user, isLoading, isAuthenticated: !!user };
}
