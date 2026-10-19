import { clone, dataFor, runtimeNodes } from '../nodes.js';
import { activeDefinitionOnly } from '../variants.js';
import { nativeBoundNodes } from './bindings.js';

// Intermediate model between workspace definitions and PHP emitters. It holds
// only JSON (compact nodes with $bind/$spread markers, defaults, field metadata),
// so emitters and profiles can change the generated PHP without re-reading the
// workspace schema.

function compactNodes(nodes) {
  return nodes.map(node => ({
    name: node.name,
    props: clone(node.props ?? {}),
    ...(node.children?.length ? { children: compactNodes(node.children) } : {})
  }));
}

// Native ZVC/ZVPs build their tree in JavaScript (`buildNode`), which cannot be
// translated: the structure is rendered with the configured data and field
// values are mapped back to $bind/$spread markers where they pass through
// unchanged (bindings.js), so the PHP reads them with zaux_gv like the JS gv.
// Without the module the stored projection (native ZVC) or the runtime
// snapshot (native ZVP) is used, with literal values.
export function phpModel(definition) {
  const active = activeDefinitionOnly(definition);
  const kind = active.kind === 'zvp' ? 'zvp' : 'zvc';
  const bound = active.sourceKey ? nativeBoundNodes(active) : null;
  const snapshot = !!active.sourceKey && !bound && kind === 'zvp';
  return {
    exportName: active.exportName,
    label: active.name,
    kind,
    native: !!active.sourceKey,
    snapshot,
    fields: (active.fields ?? []).map(field => clone({
      key: field.key,
      label: field.label ?? field.key,
      type: field.type,
      ...(Object.hasOwn(field, 'default') ? { default: field.default } : {}),
      ...(field.options ? { options: field.options } : {})
    })),
    defaults: dataFor(active),
    nodes: bound ?? (snapshot ? runtimeNodes(active) : compactNodes(active.tree ?? [])),
    partials: snapshot ? [] : (active.partials ?? []).map(phpModel),
    css: active.css ?? ''
  };
}

// Pages keep instance order and their own data; each instance carries an
// independent definition copy, so models are built per instance. Free elements
// have no component contract: they are inlined as resolved runtime nodes,
// like `templateRuntime` in domain/export.js.
export function phpPageModel(template) {
  return {
    name: template.name,
    instances: template.instances.map(instance => instance.kind === 'free'
      ? { name: instance.name, free: true, nodes: runtimeNodes(activeDefinitionOnly(instance.definition), instance.data ?? {}) }
      : { name: instance.name, free: false, model: phpModel(instance.definition), data: clone(instance.data ?? {}) })
  };
}
