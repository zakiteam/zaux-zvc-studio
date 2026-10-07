// Server-only adapter. The extractor is internal to the pinned Tailwind 3.4.17.
import extractorModule from 'tailwindcss/lib/lib/defaultExtractor.js';
import staticClasses from './generated/static-classes.json';
import config from './tailwind.config.js';

const staticSet = new Set(staticClasses);
const extract = extractorModule.defaultExtractor({ tailwindConfig: { separator: config.separator ?? ':', prefix: config.prefix ?? '' } });

// The runtime stylesheet is appended after the static one. Re-emitting a static class
// there would override its responsive variants (a runtime `hidden` beats a static
// `md:block` in Zaux templates), so only classes missing from the static CSS remain.
export function runtimeCandidates(content) {
  return [...new Set(extract(content))].filter(candidate => !staticSet.has(candidate));
}
