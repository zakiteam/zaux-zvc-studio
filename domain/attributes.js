import { isPlainRecord } from './slider.js';

// A Zaux `attributes` prop is edited visually when it is absent, null or a plain
// JSON object; a binding or any other JSON value keeps the generic editor.
export function attributesEditable(value) {
  return value == null || isPlainRecord(value);
}

// Hook mode: replaces one hook's attribute object. An emptied hook is removed so
// the prop keeps only authored data; other hooks and unknown keys stay untouched.
export function setAttributeHook(attributes, hook, value) {
  const result = { ...(isPlainRecord(attributes) ? attributes : {}) };
  if (isPlainRecord(value) && Object.keys(value).length) result[hook] = value;
  else delete result[hook];
  return result;
}

// Number of authored attributes: per hook in hook mode, top-level keys in flat mode.
export function attributeCount(attributes, mode) {
  if (!isPlainRecord(attributes)) return 0;
  if (mode === 'flat') return Object.keys(attributes).length;
  return Object.values(attributes).reduce((total, value) => total + (isPlainRecord(value) ? Object.keys(value).length : 1), 0);
}
