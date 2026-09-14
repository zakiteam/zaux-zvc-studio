import { clone, isBinding } from './nodes.js';

export const isPlainRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && !isBinding(value);

export function pathValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

export function boundPath(object, path) {
  let value = object;
  for (const key of path.split('.')) {
    if (isBinding(value)) return true;
    value = value?.[key];
  }
  return isBinding(value);
}

// Catalog paths are trusted configuration. Only the edited leaf is replaced.
export function changePath(object, path, value) {
  const result = clone(object);
  const keys = path.split('.');
  let target = result;
  for (const key of keys.slice(0, -1)) {
    if (!isPlainRecord(target[key])) target[key] = {};
    target = target[key];
  }
  if (value === undefined) delete target[keys.at(-1)];
  else target[keys.at(-1)] = clone(value);
  return result;
}
