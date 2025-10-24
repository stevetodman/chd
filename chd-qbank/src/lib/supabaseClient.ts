import { createClient } from "@supabase/supabase-js";
import config from "../config";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = config.supabase;

// Supabase client used across the SPA; all DB interactions run through RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
