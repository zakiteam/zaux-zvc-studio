import { isBinding } from './nodes.js';
import { isPlainRecord } from './slider.js';

// A Zaux contentSlots entry renders one { name, props } descriptor. Several
// items, or an item with children, are grouped under Zaux's ComponentsRenderer,
// which renders complete trees and is available in every Zaux project.
const GROUP = 'ComponentsRenderer';

export function contentSlotItems(value) {
  if (value == null) return [];
  if (!isPlainRecord(value) || isBinding(value)) return null;
  if (value.name === GROUP && Array.isArray(value.props?.components)) return value.props.components;
  return [value];
}

export function contentSlotValue(items) {
  if (!items.length) return null;
  if (items.length === 1 && !items[0]?.children?.length) return items[0];
  return { type: 'component', name: GROUP, props: { components: items } };
}

// Editor nodes carry ids; descriptors keep only the Zaux name/props/children shape.
export function contentSlotDescriptor(node, root = true) {
  const descriptor = root ? { type: 'component', name: node.name, props: node.props ?? {} } : { name: node.name, props: node.props ?? {} };
  if (node.children?.length) descriptor.children = node.children.map(child => contentSlotDescriptor(child, false));
  return descriptor;
}

export function setContentSlot(contentSlots, key, items) {
  const result = { ...(isPlainRecord(contentSlots) ? contentSlots : {}) };
  const value = contentSlotValue(items);
  if (value === null) delete result[key];
  else result[key] = value;
  return result;
}
