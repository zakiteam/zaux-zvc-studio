import { clone, dataFor } from '../../domain/nodes.js';
import { definitionFromSource, refreshSource } from '../../domain/source-zvc.js';
import { componentFiles } from '../../domain/export.js';

const modules = import.meta.glob('../zvc/**/*.zvc.js', { eager: true, import: 'default' });
const defaults = import.meta.glob('../zvc/**/data/*.defaults.js', { eager: true, import: 'default' });
const rawFiles = import.meta.glob('../zvc/**/*.{js,json,css,scss}', { eager: true, query: '?raw', import: 'default' });
const prefix = '../zvc/';
const registry = Object.fromEntries(Object.entries(modules).map(([path, module]) => [path.slice(prefix.length), module]));

function defaultPath(key) {
  const folder = key.slice(0, key.lastIndexOf('/') + 1);
  const name = key.split('/').at(-1).replace('.zvc.js', '');
  return prefix + folder + 'data/' + name + '.defaults.js';
}
export function registeredSourceDefinitions() {
  return Object.entries(registry).filter(([, module]) => module.builder !== false).map(([key, module]) =>
    definitionFromSource(key, module, defaults[defaultPath(key)] ?? {})
  );
}
export function mergeSourceLibrary(workspace) {
  for (const definition of registeredSourceDefinitions()) {
    const index = workspace.library.findIndex(item => item.id === definition.id);
    if (index < 0) workspace.library.push(definition);
    else workspace.library[index] = definition;
  }
}
export function sourceAvailable(definition) { return !!registry[definition?.sourceKey]; }
export function refreshSourceSnapshots(workspace) {
  for (const definition of workspace.library) {
    if (definition.sourceKey) refreshSource(definition, {}, registry[definition.sourceKey]);
  }
  for (const template of workspace.templates) {
    for (const instance of template.instances) {
      if (instance.definition.sourceKey) refreshSource(instance.definition, instance.data, registry[instance.definition.sourceKey]);
    }
  }
}
export function visualSourceCopy(definition, data = {}) {
  const result = clone(definition);
  refreshSource(result, data, registry[result.sourceKey]);
  delete result.sourceKey;
  delete result.defaults;
  result.fields = [];
  return result;
}
export function filesForDefinition(definition) {
  if (!definition.sourceKey) return componentFiles(definition);
  if (!sourceAvailable(definition)) throw new Error('zx_builder_source_missing');
  const directory = prefix + definition.sourceKey.slice(0, definition.sourceKey.lastIndexOf('/') + 1);
  const files = Object.fromEntries(Object.entries(rawFiles).filter(([path]) => path.startsWith(directory)).sort(([a], [b]) => Number(b.endsWith('.zvc.js')) - Number(a.endsWith('.zvc.js')) || a.localeCompare(b)).map(([path, text]) => [path.slice(directory.length), text]));
  const path = defaultPath(definition.sourceKey);
  if (rawFiles[path]) files[path.slice(directory.length)] = 'export default ' + JSON.stringify(dataFor(definition), null, 2) + ';\n';
  // Include all configured values even when the module uses a custom defaults path.
  files['instance-data.json'] = JSON.stringify(dataFor(definition), null, 2);
  if (definition.css.trim()) files['style/Studio.css'] = definition.css;
  return files;
}
export function sourceCode(definition) {
  return definition.sourceKey ? rawFiles[prefix + definition.sourceKey] ?? '' : Object.values(componentFiles(definition))[0];
}
