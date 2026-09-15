import { downloadBlob } from './files.js';
import { useSupabaseClient } from './supabase.js';

async function mediaRequest(path = '', options = {}) {
  const { data, error } = await useSupabaseClient().auth.getSession();
  if (error || !data.session) throw new Error('zx_builder_media_unauthorized');
  try {
    return await $fetch('/api/media' + path, {
      ...options, headers: { Authorization: 'Bearer ' + data.session.access_token }
    });
  } catch (error) {
    const key = error.data?.statusMessage;
    throw new Error(typeof key === 'string' && key.startsWith('zx_builder_media_') ? key : 'zx_builder_media_error');
  }
}
export function listMedia({ scope, projectId, search, page }) {
  return mediaRequest('', { query: { scope, projectId: scope === 'project' ? projectId : undefined, search, page } });
}
export function uploadMedia(file, { scope, projectId }) {
  if (file.size > 10 * 1024 * 1024) throw new Error('zx_builder_media_too_large');
  return mediaRequest('', { method: 'POST', body: file, query: { name: file.name.slice(0, 200), scope, projectId: scope === 'project' ? projectId : undefined } });
}
export function archiveMedia(id) { return mediaRequest('/' + id, { method: 'PATCH' }); }

export async function downloadMedia(asset) {
  // Fetch the original through our public route, also when previews use a CDN.
  const response = await fetch('/media/' + encodeURIComponent(asset.storage_key));
  if (!response.ok) throw new Error('zx_builder_media_download_error');
  downloadBlob(asset.name, await response.blob());
}
