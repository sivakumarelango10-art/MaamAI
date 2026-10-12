import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Returns the Supabase client instance if configured, or null if running in standard FastAPI mode.
 * The primary application security model uses the FastAPI backend as the trusted access layer.
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  return supabaseInstance;
};
