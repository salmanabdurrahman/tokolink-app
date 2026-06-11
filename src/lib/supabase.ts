import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.warn("Warning: VITE_SUPABASE_URL is not defined in the environment.");
}

// Fallback to empty string for createClient, or a dummy client if URL is empty to prevent boot crash
export const supabase = supabaseUrl 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

