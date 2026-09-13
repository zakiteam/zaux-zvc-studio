import source from './generated/tailwind.source.js';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)).replaceAll('\\', '/');
export default {
  ...source,
  theme: { ...source.theme, extend: { ...source.theme.extend, fontFamily: { ...source.theme.extend?.fontFamily, builder: ['Inter', 'system-ui', 'sans-serif'] }, minHeight: { ...source.theme.extend?.minHeight, ...source.theme.spacing, full: '100%', min: 'min-content', max: 'max-content', fit: 'fit-content', 0: '0px' }, spacing: { '2.5': '1.25rem' } } },
  safelist: source.safelist.filter(entry => String(entry.pattern) !== '/^zaux-scrollbar^/'),
  content: [`${root}app/**/*.{vue,js}`, `${root}domain/**/*.js`, `${root}vendor/zaux/{core,project}/components/**/*.{vue,js}`]
};
