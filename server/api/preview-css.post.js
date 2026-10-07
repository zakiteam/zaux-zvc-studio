import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../../integrations/zaux/tailwind.config.js';
import { runtimeCandidates } from '../../integrations/zaux/runtime-classes.js';
import { createHash } from 'node:crypto';
const cache = new Map();
export default defineEventHandler(async event => {
  const body = await readBody(event);
  if (typeof body?.content !== 'string' || body.content.length > 1_000_000) throw createError({ statusCode: 400, statusMessage: 'Invalid preview content' });
  const hash = createHash('sha256').update(body.content).digest('hex');
  if (cache.has(hash)) return { css: cache.get(hash) };
  const candidates = runtimeCandidates(body.content);
  // Zaux containers and plugin classes (prose, aspect-*) live in the components layer.
  const css = candidates.length ? (await postcss([tailwindcss({ ...config, corePlugins: { ...config.corePlugins, preflight: false }, content: [{ raw: candidates.join(' '), extension: 'html' }], safelist: [] })]).process('@tailwind components; @tailwind utilities;', { from: undefined })).css : '';
  if (cache.size >= 20) cache.delete(cache.keys().next().value);
  cache.set(hash, css);
  return { css };
});
