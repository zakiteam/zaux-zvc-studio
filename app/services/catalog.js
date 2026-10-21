import * as shared from '@integration/generated/core-shared.js';
import * as common from '@integration/generated/core-common.js';
import { MicroInteraction, ZRevealOnScroll, ViewportToggle, ScrollTopSentinel, ComponentsRenderer } from '@integration/generated/core-utils.js';
import { createNode, clone } from '../../domain/nodes.js';
import { contentSlotDescriptor } from '../../domain/content-slots.js';
import { useTranslation } from '../composables/useTranslation.js';
import palette from '../data/catalog/palette.js';
import { propertyDescriptors } from '../../integrations/zaux/descriptors/property-descriptors.js';

const registry = { ...shared, ...common, MicroInteraction, ZRevealOnScroll, ViewportToggle, ScrollTopSentinel, ComponentsRenderer };
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
  if (name === 'ZLightbox') node.props.id = 'lightbox-' + node.id;
  if (name.startsWith('Input') || name === 'ZForm') node.props.name += '-' + node.id;
  return node;
}
// Picker entries for component descriptors: Zaux, native HTML, then ZVP partials.
export function componentMenuItems(translate, partials = []) {
  const zaux = catalog.filter(entry => !entry.html);
  const html = catalog.filter(entry => entry.html);
  return [
    ...(zaux.length ? [{ heading: translate('zx_builder_zaux') }] : []),
    ...zaux.map(entry => ({ id: entry.name, label: entry.name })),
    ...(html.length ? [{ heading: translate('zx_builder_native') }] : []),
    ...html.map(entry => ({ id: entry.name, label: entry.name })),
    ...(partials.length ? [{ separator: true }, { heading: translate('zx_builder_partials') }] : []),
    ...partials.map(item => ({ id: item.exportName, label: item.name + ' (ZVP)' }))
  ];
}
export function componentLabel(item, partials = []) {
  const partial = partials.find(entry => entry.exportName === item?.name);
  return partial ? partial.name + ' (ZVP)' : item?.name ?? '';
}
// ZVPs are referenced by export name; catalog presets keep their props and children.
export function componentDescriptor(name, partials = []) {
  const partial = partials.find(entry => entry.exportName === name);
  return partial ? { type: 'component', name: partial.exportName, props: {} } : contentSlotDescriptor(catalogNode(name));
}
export function propertyInfo(name, context = {}) {
  // Existing/sourced components remain editable even when absent from the palette.
  return propertyDescriptors(name, registry[name]?.props ?? { textContent: { default: '' } }, context);
}
