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
// ── Vue SFC export ─────────────────────────────────────────────────────────
// Translates the node tree into a single-file component following the Zaux
// component conventions: ordinary <script> with Composition API (setup()),
// no <script setup> and no TypeScript. Field keys become component props and
// $bind markers become prop references; literal values stay inline.

const HTML_ELEMENT_RE = /^[a-z]/;
const CONTENT_SLOT_COMPONENTS = ['Accordion', 'OffCanvas', 'ZModal'];
const JS_IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function vueEscapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Escapes a static attribute value kept inside double quotes.
function vueEscapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
// A JS string literal using single quotes, so the surrounding double-quoted
// attribute stays free of entity noise. `&` is entity-escaped and decoded back
// by the Vue compiler before the expression is evaluated.
function vueString(value) {
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/&/g, '&amp;') + "'";
}
// Serializes a value as a JS expression with single-quoted strings.
function vueExpr(value) {
  if (isBinding(value)) return value.$bind;
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return vueString(value);
  if (Array.isArray(value)) return '[' + value.map(vueExpr).join(', ') + ']';
  if (typeof value === 'object') return '{ ' + Object.entries(value).map(([key, item]) => `${vueKey(key)}: ${vueExpr(item)}`).join(', ') + ' }';
  return JSON.stringify(value);
}
function vueKey(key) {
  return JS_IDENTIFIER_RE.test(key) ? key : JSON.stringify(key);
}
function vueAttr(key, value) {
  if (isBinding(value)) return `:${key}="${value.$bind}"`;
  if (value === true) return key;
  if (value === false) return `:${key}="false"`;
  if (value === null) return `:${key}="null"`;
  if (typeof value === 'number') return `:${key}="${value}"`;
  if (typeof value === 'string') return `${key}="${vueEscapeAttr(value)}"`;
  return `:${key}="${vueExpr(value)}"`;
}
function vueNode(node, depth) {
  if (!node || typeof node.name !== 'string' || !node.name.trim()) return '';
  const pad = '  '.repeat(depth);
  const name = node.name;
  const html = HTML_ELEMENT_RE.test(name);
  const props = { ...(node.props ?? {}) };
  const children = (node.children ?? []).filter(Boolean);

  let textContent = '';
  let innerHTML = '';
  if (html) {
    if (props.textContent != null && typeof props.textContent !== 'object') {
      textContent = String(props.textContent);
      delete props.textContent;
    }
    if (typeof props.innerHTML === 'string') {
      innerHTML = props.innerHTML;
      delete props.innerHTML;
    }
  }

  const attrs = Object.entries(props).map(([key, value]) => vueAttr(key, value)).filter(Boolean);
  const attrString = attrs.length ? ' ' + attrs.join(' ') : '';

  if (CONTENT_SLOT_COMPONENTS.includes(name) && children.length) {
    const content = children.map(child => vueNode(child, depth + 2)).filter(Boolean).join('\n');
    return `${pad}<${name}${attrString}>\n${pad}  <template #content>\n${content}\n${pad}  </template>\n${pad}</${name}>`;
  }
  if (innerHTML) {
    return `${pad}<${name}${attrString} v-html="${vueExpr(innerHTML)}" />`;
  }
  if (children.length) {
    const inner = [
      textContent ? '  '.repeat(depth + 1) + vueEscapeText(textContent) : '',
      ...children.map(child => vueNode(child, depth + 1)).filter(Boolean),
    ].filter(Boolean).join('\n');
    return `${pad}<${name}${attrString}>\n${inner}\n${pad}</${name}>`;
  }
  if (textContent) {
    return `${pad}<${name}${attrString}>${vueEscapeText(textContent)}</${name}>`;
  }
  return `${pad}<${name}${attrString} />`;
}
function vuePropType(field) {
  if (field.type === 'switch') return 'Boolean';
  if (field.type === 'number') return 'Number';
  const value = field.default;
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return 'Number';
  if (Array.isArray(value)) return 'Array';
  if (value && typeof value === 'object') return 'Object';
  return 'String';
}
function vuePropDefault(field) {
  const value = field.default;
  if (value === undefined || value === null) return 'null';
  if (Array.isArray(value)) return `() => ${JSON.stringify(value)}`;
  if (value && typeof value === 'object') return `() => (${JSON.stringify(value)})`;
  return JSON.stringify(value);
}
function vueProps(fields) {
  const list = (fields ?? []).filter(field => field && typeof field.key === 'string' && field.key.trim());
  if (!list.length) return '{}';
  return '{\n' + list.map(field => {
    const type = vuePropType(field);
    const declaration = type === 'String'
      ? `default: ${vuePropDefault(field)}`
      : `type: ${type},\n      default: ${vuePropDefault(field)}`;
    return `    ${vueKey(field.key)}: {\n      ${declaration},\n    }`;
  }).join(',\n') + ',\n  }';
}
export function vueComponent(definition) {
  validateDefinition(definition);
  const body = (definition.tree ?? []).map(node => vueNode(node, 1)).filter(Boolean).join('\n') || '  <div />';
  const css = (definition.css ?? '').trim();
  let source = `<template>\n${body}\n</template>\n\n<script>\nexport default {\n  props: ${vueProps(definition.fields)},\n  setup() {\n    return {};\n  },\n};\n</script>\n`;
  if (css) source += `\n<style scoped>\n${css}\n</style>\n`;
  return source;
}

export function templateRuntime(template) {
  return template.instances.flatMap(instance =>
    runtimeNodes(instance.definition, instance.data).map(node => ({
      ZVCName: instance.definition.exportName,
      ...node
    }))
  );
}
