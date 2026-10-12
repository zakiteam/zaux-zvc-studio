import { createDefinition, createInstance } from './workspace.js';
import { snapshotNode, materializeNode } from './node-clipboard.js';
import { clone, uid } from './nodes.js';

// Reuse the instance storage envelope without making a library ZVC or a DOM wrapper.
export function createFreeInstance(name) {
  const instance = createInstance(createDefinition(name));
  instance.kind = 'free';
  delete instance.sourceId;
  return instance;
}

export function freeGroupCandidates(template, startId) {
  const start = template.instances.findIndex(item => item.id === startId);
  if (start < 0) return [];
  const result = [];
  for (const instance of template.instances.slice(start)) {
    if (instance.kind !== 'free') break;
    result.push(instance);
  }
  return result;
}

export function groupFreeInstances(template, library, startId, endId, name) {
  const candidates = freeGroupCandidates(template, startId);
  const end = candidates.findIndex(item => item.id === endId);
  if (end < 0 || !name.trim()) throw new Error('zx_builder_invalid_document');
  const definition = createDefinition(name.trim());
  const names = new Set(library.map(item => item.exportName.toLowerCase()));
  const base = definition.exportName;
  for (let suffix = 2; names.has(definition.exportName.toLowerCase()); suffix++) definition.exportName = base + suffix;
  for (const instance of candidates.slice(0, end + 1)) {
    for (const node of instance.definition.tree) {
      definition.tree.push(materializeNode(snapshotNode(node, instance.definition, instance.data, library), definition, library));
    }
  }
  library.push(definition);
  const instance = createInstance(definition);
  // copyDefinition derives the name again; keep the collision-free export identity.
  instance.definition.exportName = definition.exportName;
  template.instances.splice(template.instances.findIndex(item => item.id === startId), end + 1, instance);
  return instance;
}

// A ZVC instance is a top-level page block, so only a root node of a free block can become one.
export function isFreeRoot(instance, nodeId) {
  return instance?.kind === 'free' && instance.definition.tree.some(node => node.id === nodeId);
}

// Replaces a root node of a free block with `instance` in place. Other roots of that block stay
// free blocks before and after it, keeping their node ids.
export function replaceFreeRoot(template, instanceId, nodeId, instance) {
  const index = template.instances.findIndex(item => item.id === instanceId);
  const source = template.instances[index];
  if (!isFreeRoot(source, nodeId)) throw new Error('zx_builder_invalid_document');
  const position = source.definition.tree.findIndex(node => node.id === nodeId);
  const after = source.definition.tree.slice(position + 1);
  const blocks = [];
  if (position > 0) {
    source.definition.tree = source.definition.tree.slice(0, position);
    blocks.push(source);
  }
  blocks.push(instance);
  if (after.length) {
    const rest = clone(source);
    rest.id = uid();
    rest.definition = { ...clone(source.definition), id: uid(), tree: after };
    blocks.push(rest);
  }
  template.instances.splice(index, 1, ...blocks);
  return instance;
}

// Inverse of groupFreeInstances: each root node of a ZVC instance becomes an independent free
// block in place, with bindings resolved to the instance values. `ids` maps old to new node ids.
export function detachInstance(template, library, instanceId) {
  const index = template.instances.findIndex(item => item.id === instanceId);
  const source = template.instances[index];
  if (!source || source.kind === 'free' || source.definition.sourceKey || !source.definition.tree.length) throw new Error('zx_builder_invalid_document');
  const ids = {};
  const instances = source.definition.tree.map(node => {
    const instance = createFreeInstance(node.name);
    const copy = materializeNode(snapshotNode(node, source.definition, source.data, library), instance.definition, library);
    instance.definition.tree.push(copy);
    pairIds(node, copy, ids);
    return instance;
  });
  template.instances.splice(index, 1, ...instances);
  return { instances, ids };
}

function pairIds(node, copy, ids) {
  if (!copy) return;
  ids[node.id] = copy.id;
  node.children.forEach((child, index) => pairIds(child, copy.children[index], ids));
}
