export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => globalThis.crypto.randomUUID();
export const bind = key => ({ $bind: key });
export const isBinding = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && typeof value.$bind === 'string';

export function getValue(data, path) {
  if (Object.hasOwn(data, path)) return data[path];
  return path.split('.').reduce((value, key) => value?.[key], data);
}
export function resolveValue(value, data) {
  if (isBinding(value)) return getValue(data, value.$bind) ?? null;
  if (Array.isArray(value)) return value.map(item => resolveValue(item, data));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, data)]));
  return value;
}
export function createNode(name = 'div', props = {}, children = []) {
  return { id: uid(), name, props: clone(props), children };
}
export function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}
export function locateNode(nodes, id) {
  for (let index = 0; index < nodes.length; index++) {
    if (nodes[index].id === id) return { list: nodes, index };
    const child = locateNode(nodes[index].children, id);
    if (child) return child;
  }
  return null;
}
export function copyNode(node) {
  return { ...clone(node), id: uid(), sourceNodeId: node.sourceNodeId ?? node.id, children: node.children.map(copyNode) };
}
export function wrapNode(nodes, id) {
  const location = locateNode(nodes, id);
  if (!location) throw new Error('zx_builder_missing_node');
  const wrapper = createNode('div', {}, [location.list[location.index]]);
  location.list.splice(location.index, 1, wrapper);
  return wrapper;
}
export function insertNode(nodes, node, targetId = null, position = 'after') {
  if (!targetId) { nodes.push(node); return; }
  const target = locateNode(nodes, targetId);
  if (!target) throw new Error('zx_builder_missing_node');
  if (position === 'inside') target.list[target.index].children.push(node);
  else target.list.splice(target.index + (position === 'after' ? 1 : 0), 0, node);
}
export function moveNode(nodes, id, targetId, position) {
  const node = findNode(nodes, id);
  if (!node || id === targetId || findNode(node.children, targetId)) return false;
  // Check the destination before removing the source.
  if (targetId && !findNode(nodes, targetId)) return false;
  const source = locateNode(nodes, id);
  source.list.splice(source.index, 1);
  insertNode(nodes, node, targetId, position);
  return true;
}
export function dataFor(definition, overrides = {}) {
  return { ...clone(definition.defaults ?? {}), ...Object.fromEntries(definition.fields.filter(field => Object.hasOwn(field, 'default')).map(field => [field.key, clone(field.default)])), ...overrides };
}
export function runtimeNodes(definition, overrides = {}, editable = false) {
  const data = dataFor(definition, overrides);
  function render(node) {
    const result = { name: node.name, props: resolveValue(node.props, data) };
    if (editable) result.props['data-zb-node'] = node.id;
    if (node.children.length) result.children = node.children.map(render);
    return result;
  }
  return definition.tree.map(render);
}
export function runtimeRoot(definition, overrides = {}) {
  return { ZVCName: definition.exportName, name: 'ComponentsRenderer', props: { components: runtimeNodes(definition, overrides) } };
}
