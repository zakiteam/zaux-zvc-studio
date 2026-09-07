import { clone, dataFor } from './nodes.js';

// Adapt a rendered Zaux node without trying to infer its JavaScript logic.
export function sourceTree(root, prefix) {
  function nodes(value, path) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap((item, index) => nodes(item, path + '.' + index));
    if (value.name === 'ComponentsRenderer' && Array.isArray(value.props?.components)) return nodes(value.props.components, path + '.components');
    if (typeof value.name !== 'string') throw new Error('zx_builder_native_invalid');
    const props = clone(value.props ?? {});
    const children = nodes(value.children ?? [], path + '.children');
    // Zsection's default slot and component content are sequential siblings.
    if (value.name === 'Zsection' && props.content?.type === 'component') {
      children.push(...nodes(props.content, path + '.content'));
      delete props.content;
    }
    return [{ id: prefix + ':' + path, name: value.name, props, children }];
  }
  return nodes(root, 'root');
}
export function definitionFromSource(key, module, defaults = {}) {
  if (typeof module?.buildNode !== 'function' || !module.ZVCName) throw new Error('zx_builder_native_invalid');
  const definition = {
    id: 'source:' + key, name: module.label || module.ZVCName, exportName: module.ZVCName,
    sourceKey: key, defaults: clone(defaults), fields: clone(module.fields ?? []), tree: [], css: ''
  };
  definition.tree = sourceTree(module.buildNode(dataFor(definition), {}), definition.id);
  return definition;
}
export function refreshSource(definition, data, module) {
  if (!module) return false;
  definition.tree = sourceTree(module.buildNode(dataFor(definition, data), {}), definition.id);
  return true;
}
