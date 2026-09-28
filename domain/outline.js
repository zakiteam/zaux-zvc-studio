import { findNode, locateNode, insertNode } from './nodes.js';
import { snapshotNode, materializeNode } from './node-clipboard.js';
import { createFreeInstance } from './template-elements.js';

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
  if (!libraryMode) {
    for (let index = instances.length - 1; index >= 0; index--) {
      if (instances[index].kind === 'free' && !instances[index].definition.tree.length) instances.splice(index, 1);
    }
  }
  return result;
}
