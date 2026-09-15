import { clone, copyNode, dataFor, resolveValue } from './nodes.js';
import { capturePartials } from './partials.js';

// Bindings become the values visible when copying, independent of the destination data.
export function snapshotNode(node, definition, overrides, library) {
  const data = dataFor(definition, overrides);
  function snapshot(item) {
    return { ...clone(item), props: resolveValue(item.props, data), children: item.children.map(snapshot) };
  }
  const owner = { ...clone(definition), tree: [snapshot(node)] };
  capturePartials(owner, library);
  return clone({ node: owner.tree[0], partials: owner.partials ?? [], css: owner.css });
}

export function materializeNode(snapshot, definition, library) {
  const node = copyNode(snapshot.node);
  const names = new Set([definition.exportName, ...library.map(item => item.exportName), ...(definition.partials ?? []).map(item => item.exportName)]);
  const aliases = new Map();
  const dependencies = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string' && value.props) {
      const source = snapshot.partials.find(item => item.exportName === value.name);
      if (source) {
        if (!aliases.has(source.exportName)) {
          let name = source.exportName;
          for (let suffix = 2; names.has(name); suffix++) name = source.exportName + suffix;
          names.add(name);
          aliases.set(source.exportName, name);
          dependencies.push({ ...clone(source), exportName: name });
        }
        value.name = aliases.get(source.exportName);
      }
    }
    Object.values(value).forEach(visit);
  }
  visit(node);
  if (dependencies.length) (definition.partials ??= []).push(...dependencies);
  if (snapshot.css && !definition.css.includes(snapshot.css)) definition.css = [definition.css, snapshot.css].filter(Boolean).join('\n');
  return node;
}
