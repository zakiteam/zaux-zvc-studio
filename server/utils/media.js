import { createClient } from '@supabase/supabase-js';
import { createError, getHeader, setHeader } from 'h3';
import { useRuntimeConfig } from '#imports';
import { isAbsolute, join } from 'node:path';

export const mediaColumns = 'id, scope, project_id, owner_id, storage_key, name, bytes, width, height, created_at, archived_at';
export const mediaMaxBytes = 10 * 1024 * 1024;
export const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function mediaError(statusCode, key = 'error') {
  return createError({ statusCode, statusMessage: 'zx_builder_media_' + key });
}
export function mediaConfig(event) {
  const config = useRuntimeConfig(event);
  if (!config.mediaStorageDir || !isAbsolute(config.mediaStorageDir) || !/^https?:\/\//.test(config.mediaPublicBaseUrl)) throw mediaError(503, 'unconfigured');
  return { directory: config.mediaStorageDir, baseUrl: config.mediaPublicBaseUrl.replace(/\/$/, '') };
}
export function mediaPath(event, key) {
  if (!/^[0-9a-f-]{36}(?:-thumb)?\.webp$/.test(key)) throw mediaError(404);
  return join(mediaConfig(event).directory, key);
}
export function mediaRecord(event, asset) {
  const { baseUrl } = mediaConfig(event);
  return { ...asset, url: baseUrl + '/' + asset.storage_key, thumbnailUrl: baseUrl + '/' + asset.id + '-thumb.webp' };
}
export async function mediaSession(event) {
  setHeader(event, 'Cache-Control', 'no-store');
  const config = useRuntimeConfig(event);
  const authorization = getHeader(event, 'authorization');
  if (!authorization?.startsWith('Bearer ')) throw mediaError(401, 'unauthorized');
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) throw mediaError(503, 'unconfigured');
  const client = createClient(config.public.supabaseUrl, config.public.supabasePublishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw mediaError(401, 'unauthorized');
  const { data: profile, error: profileError } = await client.from('profiles').select('active').eq('id', data.user.id).single();
  if (profileError || !profile?.active) throw mediaError(403, 'unauthorized');
  return { client, user: data.user };
}
export async function mediaScope(client, scope, projectId, write = false) {
  if (!['project', 'global'].includes(scope)) throw mediaError(400);
  if (scope === 'global') {
    if (projectId) throw mediaError(400);
    return null;
  }
  if (typeof projectId !== 'string' || !mediaIdPattern.test(projectId)) throw mediaError(400);
  const { data: role, error } = await client.rpc('project_role', { project_uuid: projectId });
  if (error || !role || (write && !['owner', 'editor'].includes(role))) throw mediaError(403, 'unauthorized');
  return projectId;
}
// Count the actual stream, including chunked requests, before decoding images.
export async function readMediaUpload(event) {
  if (Number(getHeader(event, 'content-length')) > mediaMaxBytes) throw mediaError(413, 'too_large');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of event.node.req) {
    bytes += chunk.length;
    if (bytes > mediaMaxBytes) throw mediaError(413, 'too_large');
    chunks.push(chunk);
  }
  if (!bytes) throw mediaError(400, 'invalid');
  return Buffer.concat(chunks);
}
