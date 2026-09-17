import { getValue } from './nodes.js';
export function fieldInputType(field) {
  if (field.type === 'html') return 'textarea';
  if (field.type === 'buttongroup') return 'buttongroup';
  if (['button', 'component'].includes(field.type)) return 'json';
  return field.type;
}
export function isFieldVisible(field, data) {
  if (!field.showIf) return true;
  const conditions = Array.isArray(field.showIf) ? field.showIf : [field.showIf];
  return conditions.every(({ field: key, operator = 'eq', value }) => {
    const current = getValue(data, key);
    switch (operator) {
      case 'neq': return current !== value;
      case 'gt': return Number(current) > value;
      case 'lt': return Number(current) < value;
      case 'in': return Array.isArray(value) && value.includes(current);
      case 'contains': return typeof current?.includes === 'function' && current.includes(value);
      case 'notEmpty': case 'noEmpty': return !!current && current !== '';
      default: return current === value;
    }
  });
}
