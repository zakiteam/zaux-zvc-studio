import { restoreInstance } from './restore-instance.js';
import { clone, dataFor } from './nodes.js';
import { selectVariant } from './variants.js';

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

export function partialLibraryDefinition(partial, library) {
  return partial && library.find(item => item.kind === 'zvp' && item.id === (partial.libraryId ?? partial.id));
}

// Variant choice belongs to this occurrence, never to its shared descriptor data.
export function selectPartialVariant(owner, reference, id, library, data = {}) {
  capturePartials(owner, library, data);
  const partial = owner.partials?.find(item => item.exportName === reference.name);
  if (!partial || partial.activeVariant === id) return;
  let count = 0;
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.name === reference.name && value.props) count++;
    Object.values(value).forEach(visit);
  }
  visit(owner.tree);
  visit(dataFor(owner, data));
  if (count <= 1) { selectVariant(partial, id); return; }
  const copy = clone(partial);
  selectVariant(copy, id);
  copy.libraryId = partial.libraryId ?? partial.id;
  const names = new Set([owner.exportName, ...library.map(item => item.exportName), ...owner.partials.map(item => item.exportName)]);
  for (let suffix = 2; names.has(copy.exportName); suffix++) copy.exportName = partial.exportName + suffix;
  owner.partials.push(copy);
  reference.name = copy.exportName;
}

// Give the restored occurrence its own dependency, leaving sibling references intact.
export function restorePartialReference(owner, reference, library, data = {}) {
  const partial = owner.partials?.find(item => item.exportName === reference.name);
  const original = partialLibraryDefinition(partial, library);
  if (!original) throw new Error('zx_builder_partial_original_missing');
  const restored = restoreInstance({ definition: partial, data: reference.props }, original);
  const definition = restored.definition;
  definition.libraryId = original.id;
  const references = new Map();
  function count(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string' && value.props) references.set(value.name, (references.get(value.name) ?? 0) + 1);
    Object.values(value).forEach(count);
  }
  count(owner.tree);
  count(dataFor(owner, data));
  if (references.get(reference.name) === 1) {
    // Reuse this occurrence's dependency instead of allocating another alias.
    definition.exportName = partial.exportName;
    owner.partials.splice(owner.partials.indexOf(partial), 1, definition);
  } else {
    const names = new Set([...library, ...owner.partials].map(item => item.exportName));
    const base = original.exportName;
    for (let suffix = 2; names.has(definition.exportName); suffix++) definition.exportName = base + suffix;
    owner.partials.push(definition);
  }
  reference.name = definition.exportName;
  reference.props = restored.data;
  // Older restores left unused internal copies behind. Keep all referenced copies.
  references.clear();
  count(owner.tree);
  count(dataFor(owner, data));
  owner.partials = owner.partials.filter(item => !item.libraryId || references.has(item.exportName));
}
