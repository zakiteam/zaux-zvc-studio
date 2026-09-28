import { clone, uid } from './nodes.js';

// Studio-only alternatives. The active content stays in the ordinary definition,
// exactly once; inactive content is moved, not mirrored on every edit.
export const variantContentKeys = ['tree', 'fields', 'css', 'defaults', 'sourceKey', 'partials', 'previewImage'];

function contentOf(definition) {
  return Object.fromEntries(variantContentKeys.filter(key => Object.hasOwn(definition, key)).map(key => [key, definition[key]]));
}

export function selectVariant(definition, id) {
  if (definition.activeVariant === id) return;
  const next = definition.variants?.find(item => item.id === id);
  const current = definition.variants?.find(item => item.id === definition.activeVariant);
  if (!next?.content || !current) throw new Error('zx_builder_invalid_document');
  current.content = contentOf(definition);
  for (const key of variantContentKeys) delete definition[key];
  Object.assign(definition, next.content);
  delete next.content;
  definition.activeVariant = id;
}

function variantName(definition, name, exceptId) {
  const value = name.trim();
  if (!value || value.length > 80 || definition.variants?.some(item => item.id !== exceptId && item.name.toLowerCase() === value.toLowerCase())) {
    throw new Error('zx_builder_variant_name_error');
  }
  return value;
}

export function addVariant(definition, name, baseName) {
  if (!definition.variants) {
    const id = uid();
    definition.variants = [{ id, name: baseName }];
    definition.activeVariant = id;
  }
  const label = variantName(definition, name);
  if (definition.variants.length >= 50) throw new Error('zx_builder_variant_limit');
  const variant = { id: uid(), name: label, content: clone(contentOf(definition)) };
  definition.variants.push(variant);
  selectVariant(definition, variant.id);
}

export function renameVariant(definition, name) {
  const current = definition.variants?.find(item => item.id === definition.activeVariant);
  if (current) current.name = variantName(definition, name, current.id);
}

export function removeVariant(definition) {
  const id = definition.activeVariant;
  const next = definition.variants?.find(item => item.id !== id);
  if (!next) return;
  selectVariant(definition, next.id);
  definition.variants = definition.variants.filter(item => item.id !== id);
}

// Cheap projection for preview/export: never traverse or clone inactive trees.
// Consumers must treat this view as read-only, or clone it before mutation.
export function activeDefinitionOnly(definition) {
  const { variants, activeVariant, ...active } = definition;
  if (active.partials) active.partials = active.partials.map(activeDefinitionOnly);
  return active;
}
