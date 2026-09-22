import { tailwindCatalog, tailwindClassCss } from '../../integrations/zaux/tailwind-assistance.js';

export default defineEventHandler(async event => {
  const enabled = useRuntimeConfig(event).public.tailwindAssistance;
  if (enabled === false || enabled === 'false') throw createError({ statusCode: 404 });
  const body = await readBody(event);
  if (body?.catalog === true) return tailwindCatalog();
  const className = body?.className;
  if (typeof className !== 'string' || !className || className.length > 512 || /\s/.test(className)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Tailwind candidate' });
  }
  return { css: await tailwindClassCss(className) };
});
