import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://inrrhqnkvwublklehivy.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kw-KyJZvPfraCnunbhRJvw_MqgN8vUv';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Returns the Supabase client instance.
 * The primary application security model uses the FastAPI backend as the trusted access layer,
 * with optional direct Supabase client capabilities for real-time channels or storage.
 */
export const getSupabaseClient = (): SupabaseClient => {
  return supabase;
};
