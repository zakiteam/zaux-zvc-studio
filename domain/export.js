import { clone, createNode, isBinding, runtimeNodes, uid } from './nodes.js';
import { sourceTree } from './source-zvc.js';
import { validateDefinition, validateWorkspace, parseJson } from './validation.js';
import { createDefinition } from './workspace.js';

const isNodeDocument = value => value && typeof value === 'object' && !Array.isArray(value)
  && Object.hasOwn(value, 'props') && !Object.hasOwn(value, 'tree') && !Object.hasOwn(value, 'schemaVersion');

// Compact Zaux JSON: { name, props, children? }. Prop values stay literal.
function zauxNode(input, state, depth = 0) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || depth >= 30 || ++state.count > 2000
    || typeof input.name !== 'string' || !input.name.trim()
    || !input.props || typeof input.props !== 'object' || Array.isArray(input.props)
    || (input.children !== undefined && !Array.isArray(input.children))) {
    throw new Error('zx_builder_invalid_document');
  }
  return createNode(input.name, input.props, (input.children ?? []).map(child => zauxNode(child, state, depth + 1)));
}

// Reuse the native-source projection so wrappers and slot content become
// editable outline nodes instead of content properties. Invalid shapes report
// the regular import error instead of the native-module message.
function editableNodes(value) {
  try {
    return sourceTree(value, uid());
  } catch {
    throw new Error('zx_builder_invalid_document');
  }
}

// Simple Zaux JSON: one node or an array of nodes, plus optional metadata:
// { name, props, children?, fields?, label?, ZVCName? | ZVPName? }.
// The workspace derives id, kind, export name and node ids. Prop values are not
// rewritten, so explicit $bind markers keep their binding meaning. Field
// metadata stays optional and is validated like in the full definition format.
// The display name follows label, then a declared ZVCName/ZVPName (runtime
// descriptors), then the first node name.
// With options.editable the node list is transposed into the visual
// representation instead of being copied verbatim: ComponentsRenderer wrappers,
// node arrays and Zsection component content become outline nodes.
export function definitionFromSimpleZaux(value, kind = 'zvc', options = {}) {
  const partial = kind === 'zvp';
  const meta = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const list = Array.isArray(value) ? value : [value];
  if (!list.length) throw new Error('zx_builder_invalid_document');
  const literal = list.map(item => zauxNode(item, { count: 0 }));
  const tree = options.editable ? editableNodes(value) : literal;
  const header = Array.isArray(value) ? (list[0] && typeof list[0] === 'object' ? list[0] : {}) : meta;
  const declared = [header[partial ? 'ZVPName' : 'ZVCName'], header[partial ? 'ZVCName' : 'ZVPName']]
    .find(name => typeof name === 'string' && name.trim());
  const label = typeof meta.label === 'string' ? meta.label.trim() : '';
  const definition = createDefinition(label || declared?.trim() || tree[0]?.name || literal[0].name, partial ? 'zvp' : 'zvc');
  if (meta.fields !== undefined) definition.fields = clone(meta.fields);
  definition.tree = tree;
  return validateDefinition(definition);
}

function definitionFromNode(value) { return definitionFromSimpleZaux(value, 'zvc'); }

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
export function parsePartialDocument(text) {
  const payload = parseComponentDocument(text);
  if (payload.data.sourceKey && !payload.data.sourceKey.endsWith('.zvp.js')) throw new Error('zx_builder_invalid_document');
  payload.data.kind = 'zvp';
  payload.data.exportName = payload.data.exportName.replace(/^ZVC/, 'ZVP');
  return { kind: 'component', data: validateDefinition(payload.data) };
}

// Explicit import of the simple Zaux format. Full workspace definitions and
// envelopes belong to the other option and are rejected here on purpose.
// options.editable selects the transposed, builder-editable content projection.
export function parseSimpleComponentDocument(text, kind = 'zvc', options = {}) {
  const value = parseJson(text);
  if (value && typeof value === 'object' && !Array.isArray(value)
    && (Object.hasOwn(value, 'tree') || Object.hasOwn(value, 'schemaVersion') || value.format === 'zaux-builder')) {
    throw new Error('zx_builder_invalid_simple_json');
  }
  return { kind: 'component', data: definitionFromSimpleZaux(value, kind, options) };
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
  const name = definition.exportName.replace(/^ZV[CP]/, '');
  const defaults = Object.fromEntries(definition.fields.map(field => [field.key, field.default ?? null]));
  const partial = definition.kind === 'zvp';
  const meta = { builder: true, label: definition.name, [partial ? 'ZVPName' : 'ZVCName']: definition.exportName, meta: { version: 1 }, fields: definition.fields };
  const tree = exportTree(definition.tree);
  const root = partial && tree.length === 1 ? tree[0] : { name: 'ComponentsRenderer', props: { components: tree } };
  const source = `import ZVCHelper from "@zx_core/common/helpers/zvc.helper";\nimport meta from "./${name}.meta.js";\nimport defaults from "./data/${name}.defaults.js";\n\nexport default {\n  ...meta,\n  buildNode(data = {}, params = {}) {\n    data = { ...defaults, ...data };\n    const gv = (path) => ZVCHelper.getValue(data, path);\n    const nodeObject = {\n${partial ? '' : '      meta: { ZVCName: meta.ZVCName },\n'}      node: ${jsValue(root, 3)}\n    };\n    return ZVCHelper.renderNode(nodeObject, data, params${partial ? '' : ', meta'});\n  }\n};\n`;
  const files = {
    [`${name}.${partial ? 'zvp' : 'zvc'}.js`]: source,
    [`${name}.meta.js`]: `export default ${JSON.stringify(meta, null, 2)};\n`,
    [`data/${name}.defaults.js`]: `export default ${JSON.stringify(defaults, null, 2)};\n`
  };
  if (definition.css.trim()) files[`style/${name}.css`] = definition.css;
  return files;
}
export function templateRuntime(template) {
  return template.instances.flatMap(instance =>
    runtimeNodes(instance.definition, instance.data).map(node => ({
      ZVCName: instance.definition.exportName,
      ...node
    }))
  );
}
