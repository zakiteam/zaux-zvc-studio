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
// Reorders fields in place: moves `key` before (or after) `targetKey`.
export function moveField(fields, key, targetKey, after = false) {
  const from = fields.findIndex(field => field.key === key);
  if (from < 0 || key === targetKey) return false;
  const [field] = fields.splice(from, 1);
  const index = fields.findIndex(item => item.key === targetKey);
  if (index < 0) { fields.splice(from, 0, field); return false; }
  fields.splice(index + (after ? 1 : 0), 0, field);
  return true;
}
