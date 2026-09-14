import { clone, dataFor, isBinding, resolveValue } from './nodes.js';
import { copyDefinition } from './workspace.js';

const isStyle = key => /^(class|className|style|styles|css)$|Classes$|Style$/i.test(key);
function contentProperties(value) {
  if (Array.isArray(value)) return value.map(contentProperties);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !isStyle(key)).map(([key, item]) => [key, contentProperties(item)]));
}
function nodesWithPaths(tree, parent = '') {
  return tree.flatMap((node, index) => {
    const path = parent + '/' + index;
    return [{ node, path }, ...nodesWithPaths(node.children, path)];
  });
}
function mergeProperties(target, saved, data) {
  for (const [key, value] of Object.entries(saved)) {
    if (isBinding(target[key])) data[target[key].$bind] = clone(value);
    else if (Array.isArray(value)) target[key] = value.map((item, index) => {
      if (!item || typeof item !== 'object') return clone(item);
      const result = Array.isArray(item) ? [] : {};
      const base = target[key]?.[index];
      if (base && typeof base === 'object' && Array.isArray(base) === Array.isArray(item)) Object.assign(result, clone(base));
      mergeProperties(result, item, data);
      return result;
    });
    else if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) mergeProperties(target[key], value, data);
    else target[key] = clone(value);
  }
}

export function restoreInstance(instance, definition) {
  const originalData = dataFor(instance.definition, instance.data);
  const savedData = contentProperties(originalData);
  for (const field of [...instance.definition.fields, ...definition.fields]) {
    if (field.type === 'css-editor') delete savedData[field.key];
  }
  const data = dataFor(definition);
  mergeProperties(data, savedData, data);
  const restored = { ...clone(instance), definition: copyDefinition(definition), data };
  const saved = nodesWithPaths(instance.definition.tree);
  const targets = nodesWithPaths(restored.definition.tree);
  const pending = clone(instance.unmappedProperties ?? []);
  // Native snapshots are regenerated from data, never patched as visual nodes.
  if (!instance.definition.sourceKey) {
    for (const { node, path } of saved) {
      const props = contentProperties(resolveValue(node.props, originalData));
      const candidates = targets.filter(item => item.node.name === node.name);
      const identity = node.sourceNodeId ?? node.id;
      let matches = candidates.filter(item => (item.node.sourceNodeId ?? item.node.id) === identity);
      // Older documents have no lineage. Only unambiguous component names match.
      if (!matches.length && candidates.length === 1 && saved.filter(item => item.node.name === node.name).length === 1) matches = candidates;
      const uniqueOrigin = saved.filter(item => (item.node.sourceNodeId ?? item.node.id) === identity).length === 1;
      if (!definition.sourceKey && uniqueOrigin && matches.length === 1) mergeProperties(matches[0].node.props, props, restored.data);
      else if (Object.keys(props).length) pending.push({ name: node.name, path, props });
    }
  }
  if (pending.length) restored.unmappedProperties = [...new Map(pending.map(item => [JSON.stringify(item), item])).values()];
  return restored;
}
