import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "./env";

const { supabaseUrl, supabaseAnonKey } = clientEnv;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration");
}

// Supabase client used across the SPA; all DB interactions run through RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
