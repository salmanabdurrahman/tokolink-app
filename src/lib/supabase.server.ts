import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl) {
  console.warn("Warning: Supabase URL is not defined on the server side.");
}

// Mock admin auth interface to prevent crashes when unconfigured
const dummyAdminAuth = {
  admin: {
    createUser: async () => ({
      data: { user: null },
      error: new Error("Supabase is not configured."),
    }),
    updateUserById: async () => ({
      data: { user: null },
      error: new Error("Supabase is not configured."),
    }),
    deleteUser: async () => ({ error: new Error("Supabase is not configured.") }),
  },
  getUser: async () => ({ data: { user: null }, error: new Error("Supabase is not configured.") }),
};

export const supabaseAdmin = supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : ({
      auth: dummyAdminAuth,
    } as any);
