import type { Tenant, User } from "@prisma/client";
import { create } from "zustand";

export type AuthUser = Partial<User> & { tenant?: Partial<Tenant> | null };

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: async () => {
    const { supabase } = await import("./supabase");
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
