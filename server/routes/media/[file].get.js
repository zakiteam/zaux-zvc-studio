import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { defineEventHandler, getRouterParam, sendStream, setHeaders } from 'h3';
import { mediaError, mediaPath } from '../../utils/media.js';

// Public immutable files deliberately survive catalog archiving/project deletion.
export default defineEventHandler(async event => {
  const path = mediaPath(event, getRouterParam(event, 'file') ?? '');
  let file;
  try { file = await stat(path); } catch { throw mediaError(404); }
  if (!file.isFile()) throw mediaError(404);
  setHeaders(event, {
    'Content-Type': 'image/webp', 'Content-Length': file.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
  });
  return sendStream(event, createReadStream(path));
});
