import { SPREAD, clone, getValue, isBinding, withoutSpread } from './nodes.js';

// Whole-component binding: node props `{ $spread: key, ... }` take the object value of a
// field (see resolveValue). Style props and per-prop bindings stay on the node.
const isStyleKey = key => /^(class|className|style|styles|css)$|Classes$|Style$/i.test(key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && !isBinding(value);

// Literal content props that a bound field can take over.
export function movableProps(props) {
  return Object.fromEntries(Object.entries(props ?? {}).filter(([key, value]) => key !== SPREAD && !isStyleKey(key) && !isBinding(value)));
}
// Suggested field for a component: a CTA object for ZButton, free JSON otherwise.
export function propsFieldSuggestion(name, fields) {
  const button = name === 'ZButton';
  const base = button ? 'cta' : (name.charAt(0).toLowerCase() + name.slice(1)).replace(/[^\w]/g, '') || 'props';
  let key = base;
  for (let suffix = 2; fields.some(field => field.key === key); suffix++) key = base + suffix;
  return { key, label: button ? 'CTA' : name, type: button ? 'button' : 'json' };
}
// Binds `node` to field `key` in place. With `move`, its literal content props become the
// field value (existing field values win, so the rendered result does not change): the
// field default and, when given, the instance data entry for the key.
export function bindNodeProps(node, definition, key, { move = false, data = null } = {}) {
  const moved = move ? movableProps(node.props) : {};
  node.props = { ...Object.fromEntries(Object.entries(withoutSpread(node.props)).filter(([name]) => !Object.hasOwn(moved, name))), [SPREAD]: key };
  if (!Object.keys(moved).length) return;
  const field = definition.fields.find(item => item.key === key);
  if (field) field.default = { ...clone(moved), ...(isRecord(field.default) ? field.default : {}) };
  if (data && isRecord(data[key])) data[key] = { ...clone(moved), ...data[key] };
}
// Removes the binding and keeps the current field value as literal props, as unbinding a single prop does.
export function unbindNodeProps(node, data) {
  const key = node.props[SPREAD];
  const value = typeof key === 'string' ? getValue(data, key) : null;
  node.props = { ...withoutSpread(node.props), ...(isRecord(value) ? clone(value) : {}) };
}
