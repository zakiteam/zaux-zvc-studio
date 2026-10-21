import { clone, copyNode, dataFor, resolveValue } from './nodes.js';
import { capturePartials, partialLineage, samePartial } from './partials.js';

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
  const aliases = new Map();
  const dependencies = [];
  const captured = () => [...(definition.partials ?? []), ...dependencies];
  // The library original of a copy does not block its name; another component with that name does.
  const taken = (name, source) => name === definition.exportName
    || library.some(item => item.exportName === name && item.id !== partialLineage(source))
    || captured().some(item => item.exportName === name);
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string' && value.props) {
      const source = snapshot.partials.find(item => item.exportName === value.name);
      if (source) {
        if (!aliases.has(source.exportName)) {
          // References to a ZVP the destination already carries reuse that copy: no ZVPName2 clones.
          const same = captured().find(item => samePartial(item, source));
          let name = same?.exportName ?? source.exportName;
          if (!same) {
            for (let suffix = 2; taken(name, source); suffix++) name = source.exportName + suffix;
            dependencies.push({ ...clone(source), exportName: name });
          }
          aliases.set(source.exportName, name);
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
