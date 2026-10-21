import { restoreInstance } from './restore-instance.js';
import { clone, dataFor } from './nodes.js';
import { selectVariant } from './variants.js';
import { copyDefinition } from './workspace.js';

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
        if (!partial) { partial = clone(source); delete partial.global; partials.push(partial); }
        capturePartials(partial, library, value.props, path);
      }
    }
    Object.values(value).forEach(visit);
  }
  visit(definition.tree);
  visit(dataFor(definition, data));
}

// Captured copies of one library ZVP share its id (or record it as libraryId).
export const partialLineage = partial => partial.libraryId ?? partial.id;

const sortedKeys = value => Array.isArray(value) ? value.map(sortedKeys)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedKeys(value[key])])) : value;

// Node ids, provenance and Studio labels do not change what a captured copy renders.
function implementationKey(definition) {
  const nodes = tree => (tree ?? []).map(({ id, sourceNodeId, children, ...node }) => ({ ...node, children: nodes(children) }));
  const { id, libraryId, exportName, name, previewImage, global, tree, partials, variants, ...rest } = definition;
  return JSON.stringify(sortedKeys({
    ...rest,
    tree: nodes(tree),
    variants: variants?.map(({ content, ...variant }) => content ? { ...variant, content: implementationKey(content) } : variant),
    partials: (partials ?? []).map(partial => [partial.exportName, implementationKey(partial)])
  }));
}

// Two captured copies are the same dependency: same library ZVP and same implementation.
export function samePartial(a, b) {
  return partialLineage(a) === partialLineage(b) && implementationKey(a) === implementationKey(b);
}

const isSuffixAlias = (name, base) => name !== base && name.startsWith(base) && /^\d+$/.test(name.slice(base.length));

// One dependency per implementation. Copies of the same ZVP that render the same (aliases such as
// ZVPReel2 left by paste, duplicate or resets) collapse into one and their references point to it;
// a lone suffixed alias takes back the library name when it is free. Unreferenced aliases are
// dropped, so exports carry no invisible copies. Copies that really differ (another variant, an
// older snapshot) stay separate. Native owners regenerate their tree and are left untouched.
export function mergePartialAliases(owner, library, data = {}) {
  for (const variant of owner.variants ?? []) {
    if (variant.content?.partials?.length && !variant.content.sourceKey) mergeScope(variant.content, {}, library);
  }
  if (!owner.sourceKey && owner.partials?.length) mergeScope(owner, data, library);
}

function mergeScope(scope, data, library) {
  const renames = new Map();
  const groups = new Map();
  for (const partial of scope.partials) {
    const lineage = partialLineage(partial);
    groups.set(lineage, [...(groups.get(lineage) ?? []), partial]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keys = new Map(group.map(partial => [partial, implementationKey(partial)]));
    // The shortest name (the one without a suffix) is kept.
    const ordered = [...group].sort((a, b) => a.exportName.length - b.exportName.length);
    for (const partial of ordered) {
      const kept = ordered.find(other => !renames.has(other.exportName) && keys.get(other) === keys.get(partial));
      if (kept !== partial) renames.set(partial.exportName, kept.exportName);
    }
  }
  const survivors = scope.partials.filter(partial => !renames.has(partial.exportName));
  for (const partial of survivors) {
    const base = library.find(item => item.kind === 'zvp' && item.id === partialLineage(partial))?.exportName;
    if (!base || !isSuffixAlias(partial.exportName, base) || base === scope.exportName || renames.has(base)
      || survivors.some(other => other.exportName === base)) continue;
    renames.set(partial.exportName, base);
    partial.exportName = base;
  }
  const target = name => renames.has(name) ? (renames.get(renames.get(name)) ?? renames.get(name)) : name;
  const used = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string' && value.props && typeof value.props === 'object') {
      value.name = target(value.name);
      used.add(value.name);
    }
    Object.values(value).forEach(visit);
  }
  visit(scope.tree);
  visit(scope.defaults);
  for (const field of scope.fields ?? []) visit(field.default);
  visit(data);
  scope.partials = survivors.filter(partial => {
    if (used.has(partial.exportName)) return true;
    const base = library.find(item => item.kind === 'zvp' && item.id === partialLineage(partial))?.exportName;
    return !partial.libraryId && !(base && isSuffixAlias(partial.exportName, base));
  });
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
// Soft (default) keeps this occurrence's data; hard takes a fresh library copy and empty props.
export function restorePartialReference(owner, reference, library, data = {}, { hard = false } = {}) {
  const partial = owner.partials?.find(item => item.exportName === reference.name);
  const original = partialLibraryDefinition(partial, library);
  if (!original) throw new Error('zx_builder_partial_original_missing');
  const restored = hard
    ? { definition: copyDefinition(original), data: {} }
    : restoreInstance({ definition: partial, data: reference.props }, original);
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
