import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { mediaError, mediaIdPattern, mediaSession } from '../../utils/media.js';

// A body with `name` renames an active asset; an empty body archives it.
export default defineEventHandler(async event => {
  const { client } = await mediaSession(event);
  const id = getRouterParam(event, 'id');
  if (!mediaIdPattern.test(id ?? '')) throw mediaError(400);
  const body = await readBody(event).catch(() => null);
  if (body?.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 200) throw mediaError(400);
    const { data, error } = await client.from('media_assets').update({ name }).eq('id', id).is('archived_at', null).select('id, name').maybeSingle();
    if (error || !data) throw mediaError(403, 'unauthorized');
    return data;
  }
  const { data, error } = await client.from('media_assets').update({ archived_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw mediaError(403, 'unauthorized');
  return { id: data.id };
});
