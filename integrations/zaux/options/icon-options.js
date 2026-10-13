import tokens from '../../../vendor/zaux/style/tokens/icons.json';

// Read the actual symbol IDs used by Icon.vue, including any bundled icon sets.
const sprites = import.meta.glob('../../../vendor/zaux/public/assets/icon/*/symbol-defs.svg', {
  query: '?raw', import: 'default', eager: true
});
export const iconSets = Object.fromEntries(Object.entries(sprites).map(([path, svg]) => [
  path.split('/').at(-2),
  [...new Set([...svg.matchAll(/<symbol\b[^>]*\bid=["']([^"']+)["']/g)].map(match => match[1]))].sort()
]));
// Icon.size is a CSS class; fontSize tokens become Tailwind text-* utilities.
export const iconSizes = ['', ...Object.keys(tokens.sizes).map(size => 'text-' + size)];
// Icon.vue renders the global UI set over any per-instance iconSet, so previews follow it.
export function resolveIconSet(set) {
  return typeof set === 'string' && Object.hasOwn(iconSets, set) ? set : Object.hasOwn(iconSets, 'zaux') ? 'zaux' : Object.keys(iconSets)[0] ?? 'zaux';
}
// Same URL Icon.vue builds (iconsAssetsPath is '/assets' in the Studio plugin).
export function iconHref(set, name) {
  return `/assets/icon/${resolveIconSet(set)}/symbol-defs.svg#${name}`;
}
