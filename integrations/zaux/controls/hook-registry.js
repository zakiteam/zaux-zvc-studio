// Generated hook registries are keyed by Vue file name. Registered names can differ
// by case only (Zsection is the case variant of ZSection.vue), so lookups fall back
// to a case-insensitive match and report the registry key they used.
export function registryEntry(registry, name) {
  if (!name || !registry) return null;
  if (Object.hasOwn(registry, name)) return { key: name, value: registry[name] };
  const lower = name.toLowerCase();
  const key = Object.keys(registry).find(item => item.toLowerCase() === lower);
  return key ? { key, value: registry[key] } : null;
}

// camelCase hook keys as readable labels: titleInnerElem -> "Title inner elem".
export function hookLabel(key) {
  const words = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
