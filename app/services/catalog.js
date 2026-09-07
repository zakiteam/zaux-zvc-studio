import * as shared from '@integration/generated/core-shared.js';
import * as common from '@integration/generated/core-common.js';
import { createNode, clone } from '../../domain/nodes.js';
import palette from '../data/catalog/palette.js';

const registry = { ...shared, ...common };
export const containers = palette.filter(entry => entry.container).map(entry => entry.name);
export const catalog = palette.filter(entry => entry.html || registry[entry.name]).map(entry => ({
  ...entry,
  component: registry[entry.name],
  group: entry.html ? 'zx_builder_native' : 'zx_builder_zaux',
  props: registry[entry.name]?.props ?? { textContent: { default: '' } }
}));
export function catalogNode(name) {
  const entry = palette.find(item => item.name === name);
  if (!entry || !catalog.some(item => item.name === name)) throw new Error('zx_builder_palette_blocked');
  return createNode(name, clone(entry.props ?? {}));
}
export function propertyInfo(name) {
  // Existing/sourced components remain editable even when absent from the palette.
  return registry[name]?.props ?? { textContent: { default: '' } };
}
