import { defineEventHandler, getRouterParam } from 'h3';
import { mediaError, mediaIdPattern, mediaSession } from '../../utils/media.js';

export default defineEventHandler(async event => {
  const { client } = await mediaSession(event);
  const id = getRouterParam(event, 'id');
  if (!mediaIdPattern.test(id ?? '')) throw mediaError(400);
  const { data, error } = await client.from('media_assets').update({ archived_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw mediaError(403, 'unauthorized');
  return { id: data.id };
});
