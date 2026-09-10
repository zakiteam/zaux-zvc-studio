import { clone, createNode, isBinding, runtimeRoot } from './nodes.js';
import { validateDefinition, validateWorkspace, parseJson } from './validation.js';
import { createDefinition } from './workspace.js';

const isNodeDocument = value => value && typeof value === 'object' && !Array.isArray(value)
  && Object.hasOwn(value, 'props') && !Object.hasOwn(value, 'tree') && !Object.hasOwn(value, 'schemaVersion');

function definitionFromNode(value) {
  let count = 0;
  function node(input, depth = 0) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || depth >= 30 || ++count > 2000
      || typeof input.name !== 'string' || !input.name.trim()
      || !input.props || typeof input.props !== 'object' || Array.isArray(input.props)
      || (input.children !== undefined && !Array.isArray(input.children))) {
      throw new Error('zx_builder_invalid_document');
    }
    return createNode(input.name, input.props, (input.children ?? []).map(child => node(child, depth + 1)));
  }
  const root = node(value);
  const definition = createDefinition(root.name);
  definition.tree = [root];
  return validateDefinition(definition);
}

export function documentEnvelope(kind, data) {
  return { format: 'zaux-builder', schemaVersion: 1, kind, exportedAt: new Date().toISOString(), data: clone(data) };
}
export function parseComponentDocument(text) {
  const value = parseJson(text);
  if (value?.format === 'zaux-builder') {
    const payload = parseDocument(text);
    if (payload.kind !== 'component') throw new Error('zx_builder_invalid_document');
    return payload;
  }
  return { kind: 'component', data: isNodeDocument(value) ? definitionFromNode(value) : validateDefinition(value) };
}
export function parseDocument(text) {
  const payload = parseJson(text);
  if (payload?.format === 'zaux-builder') {
    if (payload.schemaVersion !== 1) throw new Error('zx_builder_unsupported_version');
    if (payload.kind === 'workspace') return { kind: payload.kind, data: validateWorkspace(payload.data) };
    if (payload.kind === 'component') return { kind: payload.kind, data: validateDefinition(payload.data) };
    if (payload.kind === 'template') {
      validateWorkspace({ schemaVersion: 1, id: 'check', name: 'check', library: [], templates: [payload.data] });
      return { kind: payload.kind, data: payload.data };
    }
    throw new Error('zx_builder_invalid_document');
  }
  if (isNodeDocument(payload)) return { kind: 'component', data: definitionFromNode(payload) };
  return { kind: 'workspace', data: validateWorkspace(payload) };
}

// JSON values become JS literals; only explicit $bind markers become gv calls.
// No input code is evaluated, and user-provided strings remain quoted strings.
function jsValue(value, depth = 0) {
  if (isBinding(value)) return `gv(${JSON.stringify(value.$bind)})`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const entries = Array.isArray(value) ? value.map(item => jsValue(item, depth + 1)) : Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${jsValue(item, depth + 1)}`);
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  return entries.length ? `${open}\n${'  '.repeat(depth + 1)}${entries.join(',\n' + '  '.repeat(depth + 1))}\n${'  '.repeat(depth)}${close}` : open + close;
}
function exportTree(tree) {
  return tree.map(node => ({ name: node.name, props: node.props, ...(node.children.length ? { children: exportTree(node.children) } : {}) }));
}
export function componentFiles(definition) {
  validateDefinition(definition);
  const name = definition.exportName.replace(/^ZVC/, '');
  const defaults = Object.fromEntries(definition.fields.map(field => [field.key, field.default ?? null]));
  const meta = { builder: true, label: definition.name, ZVCName: definition.exportName, meta: { version: 1 }, fields: definition.fields };
  const root = { name: 'ComponentsRenderer', props: { components: exportTree(definition.tree) } };
  const source = `import ZVCHelper from "@zx_core/common/helpers/zvc.helper";\nimport meta from "./${name}.meta.js";\nimport defaults from "./data/${name}.defaults.js";\n\nexport default {\n  ...meta,\n  buildNode(data = {}, params = {}) {\n    data = { ...defaults, ...data };\n    const gv = (path) => ZVCHelper.getValue(data, path);\n    const nodeObject = {\n      meta: { ZVCName: meta.ZVCName },\n      node: ${jsValue(root, 3)}\n    };\n    return ZVCHelper.renderNode(nodeObject, data, params, meta);\n  }\n};\n`;
  const files = {
    [`${name}.zvc.js`]: source,
    [`${name}.meta.js`]: `export default ${JSON.stringify(meta, null, 2)};\n`,
    [`data/${name}.defaults.js`]: `export default ${JSON.stringify(defaults, null, 2)};\n`
  };
  if (definition.css.trim()) files[`style/${name}.css`] = definition.css;
  return files;
}
export function templateRuntime(template) {
  return { id: template.id, name: template.name, blocks: template.instances.map(instance => ({
    id: instance.id, blockName: instance.definition.exportName, data: clone(instance.data), node: runtimeRoot(instance.definition, instance.data)
  })) };
}
