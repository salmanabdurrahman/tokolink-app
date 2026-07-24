import { create } from "zustand";

type AuthState = {
  user: any | null;
  isLoading: boolean;
  setUser: (user: any) => void;
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
