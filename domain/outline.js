import { clone, uid, findNode, locateNode, insertNode, copyNode } from './nodes.js';
import { snapshotNode, materializeNode } from './node-clipboard.js';
import { createFreeInstance } from './template-elements.js';
import { copyDefinition } from './workspace.js';

export const outlineKey = row => JSON.stringify([row.instanceId, row.nodeId ?? null]);

export function outlineRows(instances, collapsed, library = false) {
  const rows = [];
  function walk(nodes, instanceId) {
    for (const node of nodes) {
      rows.push({ instanceId, nodeId: node.id });
      if (!collapsed.has(`node:${instanceId}:${node.id}`)) walk(node.children, instanceId);
    }
  }
  for (const instance of instances) {
    if (!library && instance.kind !== 'free') rows.push({ instanceId: instance.id, nodeId: null });
    const key = library ? `definition:${instance.definition.id}` : `instance:${instance.id}`;
    if (!instance.definition.sourceKey && (instance.kind === 'free' || !collapsed.has(key))) walk(instance.definition.tree, instance.id);
  }
  return rows;
}

// A selected parent already carries its descendants when moving the range.
export function outlineRoots(instances, selection) {
  const entries = selection.map(row => {
    const instance = instances.find(item => item.id === row.instanceId);
    const node = row.nodeId && instance ? findNode(instance.definition.tree, row.nodeId) : null;
    return instance && (!row.nodeId || node) ? { ...row, instance, node } : null;
  }).filter(Boolean);
  return entries.filter(entry => !entries.some(parent => parent !== entry && parent.instanceId === entry.instanceId
    && (!parent.nodeId || parent.node && findNode(parent.node.children, entry.nodeId))));
}

export function outlineDestination(instances, targetId, position, instanceId, library) {
  const instance = instances.find(item => item.id === instanceId);
  const node = instance && targetId ? findNode(instance.definition.tree, targetId) : null;
  const root = !library && position !== 'inside' && (!targetId || instance?.kind === 'free' && instance.definition.tree.includes(node));
  return { instance, node, root };
}

export function canMoveOutline(instances, selection, targetId, position, instanceId, library, containers) {
  if (!['before', 'after', 'inside'].includes(position)) return false;
  const entries = outlineRoots(instances, selection);
  if (!entries.length || entries.some(entry => entry.node && entry.instance.definition.sourceKey)) return false;
  const destination = outlineDestination(instances, targetId, position, instanceId, library);
  if (targetId && !destination.node || instanceId && !destination.instance) return false;
  if (!destination.root && (!destination.instance || destination.instance.definition.sourceKey || entries.some(entry => !entry.node))) return false;
  if (position === 'inside' && (!destination.node || !containers.includes(destination.node.name))) return false;
  return !entries.some(entry => entry.instanceId === instanceId && (
    !entry.node || entry.nodeId === targetId || findNode(entry.node.children, targetId)
    || destination.root && entry.instance.kind === 'free' && entry.instance.definition.tree.length === 1 && entry.instance.definition.tree[0] === entry.node
  ));
}

// Called inside one Builder commit, after canMoveOutline has checked the destination.
export function moveOutline(instances, selection, targetId, position, instanceId, libraryMode, library) {
  const entries = outlineRoots(instances, selection);
  const destination = outlineDestination(instances, targetId, position, instanceId, libraryMode);
  const moved = [];
  const result = [];
  for (const entry of entries) {
    if (destination.root) {
      const whole = !entry.node || entry.instance.kind === 'free' && entry.instance.definition.tree.length === 1 && entry.instance.definition.tree[0] === entry.node;
      const instance = whole ? entry.instance : createFreeInstance(entry.node.name);
      if (!whole) instance.definition.tree.push(materializeNode(snapshotNode(entry.node, entry.instance.definition, entry.instance.data, library), instance.definition, library));
      moved.push(instance);
      result.push({ instanceId: instance.id, nodeId: instance.kind === 'free' ? instance.definition.tree[0]?.id : null });
      if (whole) instances.splice(instances.indexOf(entry.instance), 1);
      else {
        const location = locateNode(entry.instance.definition.tree, entry.nodeId);
        location.list.splice(location.index, 1);
      }
    } else {
      const sameDefinition = destination.instance.definition === entry.instance.definition;
      const node = sameDefinition ? entry.node : materializeNode(snapshotNode(entry.node, entry.instance.definition, entry.instance.data, library), destination.instance.definition, library);
      const location = locateNode(entry.instance.definition.tree, entry.nodeId);
      location.list.splice(location.index, 1);
      moved.push(node);
      result.push({ instanceId, nodeId: node.id });
    }
  }
  if (destination.root) {
    const index = instances.findIndex(item => item.id === instanceId);
    instances.splice(index < 0 ? instances.length : index + (position === 'after' ? 1 : 0), 0, ...moved);
  } else {
    let anchor = targetId;
    for (const node of moved) {
      insertNode(destination.instance.definition.tree, node, anchor, position);
      if (position === 'after') anchor = node.id;
    }
  }
  if (!libraryMode) dropEmptyFreeInstances(instances);
  return result;
}

function dropEmptyFreeInstances(instances) {
  for (let index = instances.length - 1; index >= 0; index--) {
    if (instances[index].kind === 'free' && !instances[index].definition.tree.length) instances.splice(index, 1);
  }
}

function editableRoots(instances, selection) {
  const entries = outlineRoots(instances, selection);
  if (entries.some(entry => entry.node && entry.instance.definition.sourceKey)) throw new Error('zx_builder_source_structure');
  return entries;
}

// Clipboard items of the selected roots, in outline order: node snapshots (bindings resolved, like a
// single copy) or { instance } with an independent copy of a whole ZVC instance row.
export function snapshotOutline(instances, selection, library) {
  return editableRoots(instances, selection).map(entry => entry.node
    ? snapshotNode(entry.node, entry.instance.definition, entry.instance.data ?? {}, library)
    : { instance: clone(entry.instance) });
}

// Called inside one Builder commit: removes every selected root (instance rows remove the whole ZVC instance).
export function removeOutline(instances, selection, libraryMode) {
  for (const entry of editableRoots(instances, selection)) {
    if (!entry.node) { instances.splice(instances.indexOf(entry.instance), 1); continue; }
    const location = locateNode(entry.instance.definition.tree, entry.nodeId);
    location.list.splice(location.index, 1);
  }
  if (!libraryMode) dropEmptyFreeInstances(instances);
}

// Called inside one Builder commit: copies every selected root like a single duplicate (ZVC instances and
// free blocks become new template rows, nested nodes new siblings). Adjacent selected siblings form a run
// whose copies follow the run in the same order. Returns the copies' outline rows.
export function duplicateOutline(instances, selection, libraryMode, library, suffix) {
  const items = editableRoots(instances, selection).map(entry => {
    const freeRoot = !libraryMode && entry.instance.kind === 'free' && entry.instance.definition.tree.includes(entry.node);
    if (!entry.node || freeRoot) return { entry, freeRoot, list: instances, index: instances.indexOf(entry.instance) };
    const location = locateNode(entry.instance.definition.tree, entry.nodeId);
    return { entry, freeRoot, list: location.list, index: location.index };
  });
  function copy({ entry, freeRoot }) {
    if (!entry.node) {
      const instance = { ...clone(entry.instance), id: uid(), name: entry.instance.name + suffix, definition: copyDefinition(entry.instance.definition) };
      return { value: instance, row: { instanceId: instance.id, nodeId: null } };
    }
    if (freeRoot) {
      const instance = createFreeInstance(entry.node.name);
      instance.definition.tree.push(materializeNode(snapshotNode(entry.node, entry.instance.definition, entry.instance.data, library), instance.definition, library));
      return { value: instance, row: { instanceId: instance.id, nodeId: instance.definition.tree[0].id } };
    }
    const node = copyNode(entry.node);
    return { value: node, row: { instanceId: entry.instanceId, nodeId: node.id } };
  }
  const runs = [];
  for (const list of new Set(items.map(item => item.list))) {
    const sorted = items.filter(item => item.list === list).sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      const run = runs.at(-1);
      if (run?.list === list && item.index <= run.end + 1) { run.items.push(item); run.end = item.index; }
      else runs.push({ list, end: item.index, items: [item] });
    }
  }
  // Later runs of a list go first, so the indices of earlier runs stay valid.
  for (const run of runs.sort((a, b) => b.end - a.end)) {
    const copies = run.items.map(item => { const result = copy(item); item.row = result.row; return result.value; });
    run.list.splice(run.end + 1, 0, ...copies);
  }
  return items.map(item => item.row);
}
