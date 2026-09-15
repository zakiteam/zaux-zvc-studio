import { normalizeSourceFields } from './source-zvc.js';
import { validateStylePreset } from './styles.js';
import { validateComponentThemes } from './component-themes.js';
import { SCHEMA_VERSION } from './workspace.js';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function requireValue(condition, error = 'zx_builder_invalid_document') { if (!condition) throw new Error(error); }
export function parseJson(text) {
  requireValue(typeof text === 'string' && text.length <= 5_000_000, 'zx_builder_file_too_large');
  return JSON.parse(text, (key, value) => {
    requireValue(!['__proto__', 'prototype', 'constructor'].includes(key), 'zx_builder_invalid_key');
    return value;
  });
}
export function validateDefinition(definition, depth = 0) {
  requireValue(depth <= 15);
  requireValue(definition?.kind === undefined || ['zvc', 'zvp'].includes(definition.kind));
  requireValue(object(definition) && typeof definition.id === 'string' && typeof definition.name === 'string' && definition.name.trim());
  requireValue((definition.kind === 'zvp' ? /^ZVP[A-Za-z0-9_]+$/ : /^ZVC[A-Za-z0-9_]+$/).test(definition.exportName));
  requireValue(Array.isArray(definition.fields) && definition.fields.length <= 200 && typeof definition.css === 'string');
  if (definition.sourceKey !== undefined) requireValue(typeof definition.sourceKey === 'string' && /\.zv[cp]\.js$/.test(definition.sourceKey) && !definition.sourceKey.split('/').includes('..'));
  // Repair native metadata already saved by the source-library importer.
  // Visual definitions still require unique authored field keys.
  if (definition.sourceKey) definition.fields = normalizeSourceFields(definition.fields);
  if (definition.defaults !== undefined) requireValue(object(definition.defaults));
  if (definition.previewImage !== undefined) requireValue(typeof definition.previewImage === 'string');
  if (definition.partials !== undefined) {
    requireValue(Array.isArray(definition.partials) && definition.partials.length <= 100);
    const names = new Set();
    for (const partial of definition.partials) {
      requireValue(partial.kind === 'zvp' && !names.has(partial.exportName));
      names.add(partial.exportName);
      validateDefinition(partial, depth + 1);
    }
  }
  const keys = new Set();
  for (const field of definition.fields) {
    requireValue(object(field) && /^[A-Za-z_][\w.]*$/.test(field.key) && !keys.has(field.key));
    requireValue(!field.key.split('.').some(key => ['__proto__', 'prototype', 'constructor'].includes(key)));
    requireValue(['text', 'textarea', 'number', 'switch', 'select', 'json', 'html', 'css-editor', 'button', 'buttongroup', 'component'].includes(field.type) && typeof field.label === 'string');
    if (field.type === 'select') requireValue(Array.isArray(field.options));
    keys.add(field.key);
  }
  const ids = new Set();
  function walk(nodes, depth = 0) {
    requireValue(Array.isArray(nodes) && depth <= 30 && ids.size <= 2000);
    for (const node of nodes) {
      requireValue(object(node) && typeof node.id === 'string' && !ids.has(node.id));
      ids.add(node.id);
      requireValue(typeof node.name === 'string' && /^[A-Za-z][\w-]*$/.test(node.name) && object(node.props));
      requireValue(!['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base'].includes(node.name.toLowerCase()));
      walk(node.children, depth + 1);
    }
  }
  walk(definition.tree);
  return definition;
}
export function validateWorkspace(workspace) {
  requireValue(object(workspace) && workspace.schemaVersion === SCHEMA_VERSION, 'zx_builder_unsupported_version');
  requireValue(typeof workspace.id === 'string' && typeof workspace.name === 'string');
  requireValue(Array.isArray(workspace.library) && Array.isArray(workspace.templates) && workspace.templates.length > 0);
  requireValue(workspace.library.length <= 500 && workspace.templates.length <= 100);
  if (workspace.styles !== undefined) validateStylePreset(workspace.styles);
  if (workspace.componentThemes !== undefined) validateComponentThemes(workspace.componentThemes);
  if (workspace.coverImage !== undefined) requireValue(typeof workspace.coverImage === 'string');
  const ids = new Set();
  const unique = id => { requireValue(typeof id === 'string' && !ids.has(id)); ids.add(id); };
  for (const definition of workspace.library) { unique(definition.id); validateDefinition(definition); }
  for (const template of workspace.templates) {
    unique(template.id);
    requireValue(typeof template.name === 'string' && Array.isArray(template.instances) && template.instances.length <= 500);
    for (const instance of template.instances) {
      unique(instance.id);
      requireValue(typeof instance.name === 'string' && object(instance.data));
      validateDefinition(instance.definition);
    }
  }
  return workspace;
}
