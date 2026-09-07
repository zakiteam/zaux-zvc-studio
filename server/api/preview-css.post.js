import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const cache = new Map();
let config;
export default defineEventHandler(async event => {
  const body = await readBody(event);
  if (typeof body?.content !== 'string' || body.content.length > 1_000_000) throw createError({ statusCode: 400, statusMessage: 'Invalid preview content' });
  const hash = createHash('sha256').update(body.content).digest('hex');
  if (cache.has(hash)) return { css: cache.get(hash) };
  config ??= loadConfig(resolve('integrations/zaux/tailwind.config.js'));
  const result = await postcss([tailwindcss({ ...config, corePlugins: { ...config.corePlugins, preflight: false }, content: [{ raw: body.content, extension: 'html' }], safelist: [] })]).process('@tailwind utilities;', { from: undefined });
  if (cache.size >= 20) cache.delete(cache.keys().next().value);
  cache.set(hash, result.css);
  return { css: result.css };
});
