// Actual JSON values take precedence so imported custom values retain their type.
export function propertyValueType(property, value, descriptor = {}) {
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
