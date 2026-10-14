// Actual JSON values take precedence so imported custom values retain their type.
export function propertyValueType(property, value, descriptor = {}) {
  // Class strings: null/absent values show an empty field and stay untouched until edited.
  if (descriptor.control === 'classes' && (value == null || typeof value === 'string')) return 'classes';
  if (value === null || (value && typeof value === 'object')) return 'json';
  if (typeof value === 'boolean') return 'switch';
  if (typeof value === 'number') return 'number';
  if (['text', 'textarea', 'html', 'css-editor'].includes(descriptor.control)) return descriptor.control;
  if (typeof value === 'string') {
    return ['excerpt', 'contentHTML', 'innerHTML', 'paragraph', 'textContent'].includes(property) ? 'textarea' : 'text';
  }
  if (descriptor.type === Boolean || typeof descriptor.default === 'boolean') return 'switch';
  if (descriptor.type === Number || typeof descriptor.default === 'number') return 'number';
  if (descriptor.type === Object || descriptor.type === Array) return 'json';
  return 'text';
}

// First value of a prop added from the Inspector: the declared default when it is
// plain JSON (function defaults are never executed), else an empty value of the
// declared type. With notNull, a null default becomes the closest editable value.
export function propertyInitialValue(descriptor = {}, { notNull = false } = {}) {
  const value = descriptor.default;
  const typed = descriptor.type === Array ? [] : descriptor.type === Object ? {} : null;
  const initial = typeof value === 'function' ? typed : value === undefined ? '' : JSON.parse(JSON.stringify(value));
  if (initial !== null || !notNull) return initial;
  if (descriptor.media) return { type: 'img', props: {} };
  if (descriptor.items) return [];
  if (descriptor.properties) return {};
  const option = descriptor.options?.find(item => item.value !== null);
  if (option) return JSON.parse(JSON.stringify(option.value));
  const types = Array.isArray(descriptor.type) ? descriptor.type : [descriptor.type];
  if (types.includes(String)) return '';
  if (types.includes(Boolean)) return false;
  if (types.includes(Number)) return 0;
  if (types.includes(Array)) return [];
  if (types.includes(Object)) return {};
  return '';
}

// Value of a prop added from "Add property": an editable value, unless null is
// already a choice of its editor (theme-default selects, class and icon pickers).
export function propertyAddedValue(descriptor = {}) {
  const nullable = descriptor.options?.some(option => option.value === null) || ['classes', 'icon', 'component'].includes(descriptor.control);
  return propertyInitialValue(descriptor, { notNull: !nullable });
}
