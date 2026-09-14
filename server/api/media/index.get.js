import { defineEventHandler, getQuery } from 'h3';
import { mediaColumns, mediaConfig, mediaError, mediaRecord, mediaScope, mediaSession } from '../../utils/media.js';

export default defineEventHandler(async event => {
  const { client, user } = await mediaSession(event);
  mediaConfig(event);
  const { scope = 'global', projectId, search = '', page = '0' } = getQuery(event);
  const project = await mediaScope(client, scope, projectId);
  const offset = Number(page);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000 || typeof search !== 'string' || search.length > 100) throw mediaError(400);
  let query = client.from('media_assets').select(mediaColumns).eq('scope', scope).is('archived_at', null);
  query = project ? query.eq('project_id', project) : query.eq('owner_id', user.id);
  if (search.trim()) query = query.ilike('name', '%' + search.trim().replace(/[\\%_]/g, '\\$&') + '%');
  const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(offset * 24, offset * 24 + 24);
  if (error) throw mediaError(500);
  return { assets: data.slice(0, 24).map(asset => mediaRecord(event, asset)), hasMore: data.length > 24 };
});
