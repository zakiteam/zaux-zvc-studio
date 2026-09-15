import { clone, dataFor } from './nodes.js';

export function partialDefinitions(definition, library) {
  const available = new Map((definition?.partials ?? []).map(partial => [partial.exportName, partial]));
  for (const partial of library) {
    if (partial.kind === 'zvp' && partial.id !== definition?.id && !available.has(partial.exportName)) available.set(partial.exportName, partial);
  }
  return [...available.values()];
}

// Capture dependencies once in the owning definition. Existing instances never
// acquire subsequent library changes, including when the original is deleted.
export function capturePartials(definition, library, data = {}, ancestors = []) {
  if (ancestors.includes(definition.exportName) || ancestors.length > 15) throw new Error('zx_builder_partial_cycle');
  const path = [...ancestors, definition.exportName];
  const available = partialDefinitions(definition, library);
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string' && value.props && typeof value.props === 'object') {
      const source = available.find(item => item.exportName === value.name);
      if (path.includes(value.name)) throw new Error('zx_builder_partial_cycle');
      if (source) {
        const partials = definition.partials ??= [];
        let partial = partials.find(item => item.exportName === source.exportName);
        if (!partial) { partial = clone(source); partials.push(partial); }
        capturePartials(partial, library, value.props, path);
      }
    }
    Object.values(value).forEach(visit);
  }
  visit(definition.tree);
  visit(dataFor(definition, data));
}

export function definitionCss(definition) {
  return [definition.css, ...(definition.partials ?? []).map(definitionCss)].filter(Boolean).join('\n');
}
