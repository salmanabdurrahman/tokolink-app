import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.warn("Warning: VITE_SUPABASE_URL is not defined in the environment.");
}

// Mock auth interface to prevent crashes when unconfigured
const dummyAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({
    data: { user: null, session: null },
    error: new Error("Supabase is not configured."),
  }),
  signInWithOAuth: async () => ({ data: {}, error: new Error("Supabase is not configured.") }),
};

// Fallback to dummy client if URL is empty to prevent boot crash
export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      auth: dummyAuth,
      storage: {} as any,
      functions: {} as any,
    } as any);
