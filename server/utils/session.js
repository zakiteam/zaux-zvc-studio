import { createClient } from '@supabase/supabase-js';
import { getHeader, setHeader } from 'h3';
import { useRuntimeConfig } from '#imports';

// Active Studio user of a request: Supabase access token in `Authorization:
// Bearer`, verified with Supabase, profile marked active. `fail(statusCode, key)`
// builds the error of the calling API (e.g. zx_builder_media_unauthorized).
export async function studioSession(event, fail) {
  setHeader(event, 'Cache-Control', 'no-store');
  const config = useRuntimeConfig(event);
  const authorization = getHeader(event, 'authorization');
  if (!authorization?.startsWith('Bearer ')) throw fail(401, 'unauthorized');
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) throw fail(503, 'unconfigured');
  const client = createClient(config.public.supabaseUrl, config.public.supabasePublishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw fail(401, 'unauthorized');
  const { data: profile, error: profileError } = await client.from('profiles').select('active').eq('id', data.user.id).single();
  if (profileError || !profile?.active) throw fail(403, 'unauthorized');
  return { client, user: data.user };
}
