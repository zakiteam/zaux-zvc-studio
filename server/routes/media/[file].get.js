import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { defineEventHandler, getRouterParam, sendStream, setHeaders } from 'h3';
import { mediaError, mediaPath } from '../../utils/media.js';

// Public immutable files deliberately survive catalog archiving/project deletion.
export default defineEventHandler(async event => {
  const key = getRouterParam(event, 'file') ?? '';
  const path = mediaPath(event, key);
  const contentType = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }[key.split('.').pop()];
  let file;
  try { file = await stat(path); } catch { throw mediaError(404); }
  if (!file.isFile()) throw mediaError(404);
  setHeaders(event, {
    'Content-Type': contentType, 'Content-Length': file.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'"
  });
  return sendStream(event, createReadStream(path));
});
