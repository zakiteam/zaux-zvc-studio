import { createDefinition, createInstance } from './workspace.js';
import { snapshotNode, materializeNode } from './node-clipboard.js';

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
