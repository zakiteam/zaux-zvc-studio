import { createClient } from '@supabase/supabase-js';
import { useRuntimeConfig } from '#imports';

let client;

export function useSupabaseClient() {
  if (client) return client;
  const config = useRuntimeConfig();
  const url = config.public.supabaseUrl;
  const key = config.public.supabasePublishableKey;
  if (!url || !key) throw new Error('zx_builder_supabase_unconfigured');
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
