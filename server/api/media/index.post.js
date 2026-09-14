import { randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import sharp from 'sharp';
import { defineEventHandler, getQuery } from 'h3';
import { mediaColumns, mediaConfig, mediaError, mediaPath, mediaRecord, mediaScope, mediaSession, readMediaUpload } from '../../utils/media.js';

export default defineEventHandler(async event => {
  const { client, user } = await mediaSession(event);
  const { scope, projectId, name } = getQuery(event);
  const project = await mediaScope(client, scope, projectId, true);
  const config = mediaConfig(event);
  if (typeof name !== 'string' || !name.trim() || name.length > 200) throw mediaError(400);
  const input = await readMediaUpload(event);
  let output;
  let thumbnail;
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1 || metadata.width > 12000 || metadata.height > 12000) throw new Error('Invalid image');
    output = await image.rotate().webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
    thumbnail = await sharp(output.data).resize(320, 240, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
  } catch { throw mediaError(400, 'invalid'); }
  const id = randomUUID();
  const storageKey = id + '.webp';
  const files = [];
  try {
    await mkdir(config.directory, { recursive: true });
    for (const [key, buffer] of [[storageKey, output.data], [id + '-thumb.webp', thumbnail]]) {
      const path = mediaPath(event, key);
      const file = await open(path, 'wx');
      files.push(path);
      try { await file.writeFile(buffer); } finally { await file.close(); }
    }
    const { data, error } = await client.from('media_assets').insert({
      id, scope, project_id: project, owner_id: user.id, storage_key: storageKey,
      name: name.trim(), bytes: output.info.size + thumbnail.length,
      width: output.info.width, height: output.info.height
    }).select(mediaColumns).single();
    if (error) throw error;
    return mediaRecord(event, data);
  } catch {
    await Promise.allSettled(files.map(path => unlink(path)));
    throw mediaError(500);
  }
});
