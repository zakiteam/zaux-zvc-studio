import { clone, dataFor, getValue, isBinding } from './nodes.js';
import { contentSlotItems } from './content-slots.js';

// Repeater: a `component` field in list mode (`params.mode: 'array'`) holding Zaux
// descriptors ({ type, name, props, children? }), optionally limited to the names
// in `params.allowed` (ZVP export names and Vue/HTML catalog names). A node prop
// bound to it (`{ $bind: key }`) receives the entries: the Repeater palette element
// is a ComponentsRenderer whose `components` is bound, as `gv('slides')` feeds
// SliderMultiple `slides` in a hand-written ZVC.
export const REPEATER_NODE = 'ComponentsRenderer';
export const REPEATER_PROP = 'components';
// Plain keys only: the PHP export resolves the entries as `$data[key]`.
export const REPEATER_KEY = /^[A-Za-z_]\w*$/;

export const isRepeaterField = field => field?.type === 'component' && field.params?.mode === 'array';

export function allowedEntries(field) {
  const allowed = field?.params?.allowed;
  return Array.isArray(allowed) && allowed.length ? allowed : null;
}

export function entryAllowed(field, name) {
  const allowed = allowedEntries(field);
  return !allowed || allowed.includes(name);
}

// Names of the components in a list of entries (grouped entries count each item).
export function entryNames(entries) {
  const names = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    for (const item of contentSlotItems(entry) ?? []) if (typeof item?.name === 'string') names.push(item.name);
  }
  return names;
}

// Repeater fields a node feeds: { prop, field } for each prop bound to one.
export function nodeRepeaters(node, fields = []) {
  return Object.entries(node?.props ?? {}).flatMap(([prop, value]) => {
    const field = isBinding(value) ? fields.find(item => item.key === value.$bind) : null;
    return isRepeaterField(field) ? [{ prop, field }] : [];
  });
}

export const isRepeaterNode = node => node?.name === REPEATER_NODE;

// Current entries of a repeater node: the bound field value, or its literal list.
export function repeaterEntries(definition, node, data = {}) {
  const value = node.props?.[REPEATER_PROP];
  if (isBinding(value)) {
    const entries = getValue(dataFor(definition, data), value.$bind);
    return Array.isArray(entries) ? entries : [];
  }
  return Array.isArray(value) ? value : [];
}

// Appends an entry where the repeater node reads it: the template data of the
// instance (`data`, mutated), the field default (library editing, data null) or
// the node's literal list. Throws when the bound field does not accept the name.
export function appendRepeaterEntry(definition, node, descriptor, data = null) {
  const value = node.props?.[REPEATER_PROP];
  const field = isBinding(value) ? definition.fields.find(item => item.key === value.$bind) : null;
  if (field && !entryNames([descriptor]).every(name => entryAllowed(field, name))) throw new Error('zx_builder_repeater_not_allowed');
  const entries = [...repeaterEntries(definition, node, data ?? {}), clone(descriptor)];
  if (!isBinding(value)) node.props[REPEATER_PROP] = entries;
  else if (data) data[value.$bind] = entries;
  else if (field) field.default = entries;
  else throw new Error('zx_builder_invalid_document');
}

// Turns the literal entries of a repeater node into a new repeater field and binds the node to it.
export function createRepeaterField(definition, node, { key, label = '', allowed = [] }) {
  if (!REPEATER_KEY.test(key) || definition.fields.some(field => field.key === key)) throw new Error('zx_builder_field_exists');
  const value = node.props?.[REPEATER_PROP];
  const entries = Array.isArray(value) ? clone(value) : [];
  definition.fields.push({
    key, label: label || key, type: 'component',
    params: { mode: 'array', ...(allowed.length ? { allowed: [...allowed] } : {}) },
    default: entries
  });
  node.props[REPEATER_PROP] = { $bind: key };
}
