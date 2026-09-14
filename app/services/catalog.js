import * as shared from '@integration/generated/core-shared.js';
import * as common from '@integration/generated/core-common.js';
import { createNode, clone } from '../../domain/nodes.js';
import { useTranslation } from '../composables/useTranslation.js';
import palette from '../data/catalog/palette.js';
import { propertyDescriptors } from '../../integrations/zaux/property-descriptors.js';

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
  const { translate } = useTranslation();
  const makeNode = node => createNode(node.name, node.props ?? {}, (node.children ?? []).map(makeNode));
  const node = createNode(name, clone(entry.createProps ? entry.createProps(translate) : entry.props ?? {}), (entry.createChildren?.(translate) ?? []).map(makeNode));
  if (name === 'OffCanvas') node.props.offCanvasId = 'offcanvas-' + node.id;
  if (name === 'ZModal') node.props.modalId = 'modal-' + node.id;
  if (name.startsWith('Input') || name === 'ZForm') node.props.name += '-' + node.id;
  return node;
}
export function propertyInfo(name) {
  // Existing/sourced components remain editable even when absent from the palette.
  return propertyDescriptors(name, registry[name]?.props ?? { textContent: { default: '' } });
}
