import { localSourceFiles } from '../../domain/source-files.js';
import partialRendererSource from '../../integrations/zaux/renderers/partial-renderer.js?raw';
import { registerSourceModules } from '../../domain/source-runtime.js';
import { capturePartials } from '../../domain/partials.js';
import { clone, dataFor } from '../../domain/nodes.js';
import { definitionFromSource, refreshSource } from '../../domain/source-zvc.js';
import slotRendererSource from '../../integrations/zaux/renderers/slot-renderer.js?raw';
import { componentFiles } from '../../domain/export.js';
import { zauxSources } from '../../integrations/zaux/source-library.js';

const modules = import.meta.glob('../zvc/**/*.{zvc,zvp}.js', { eager: true, import: 'default' });
const defaults = import.meta.glob('../zvc/**/data/*.defaults.js', { eager: true, import: 'default' });
const rawFiles = import.meta.glob('../zvc/**/*.{js,json,css,scss}', { eager: true, query: '?raw', import: 'default' });
const prefix = '../zvc/';
const registry = {
  ...Object.fromEntries(Object.entries(zauxSources).map(([key, source]) => [key, source.module])),
  ...Object.fromEntries(Object.entries(modules).map(([path, module]) => [path.slice(prefix.length), module]))
};

registerSourceModules(registry);

function defaultPath(key) {
  const folder = key.slice(0, key.lastIndexOf('/') + 1);
  const name = key.split('/').at(-1).replace(/\.zv[cp]\.js$/, '');
  return prefix + folder + 'data/' + name + '.defaults.js';
}
export function registeredSourceDefinitions() {
  return Object.entries(registry).filter(([, module]) => module.builder !== false).map(([key, module]) =>
    definitionFromSource(key, module, zauxSources[key]?.defaults ?? defaults[defaultPath(key)] ?? {})
  );
}
export function mergeSourceLibrary(workspace) {
  for (const definition of registeredSourceDefinitions()) {
    const index = workspace.library.findIndex(item => item.id === definition.id);
    if (index < 0) workspace.library.push(definition);
    else {
      // Preview is Studio metadata, independent of the source implementation.
      if (workspace.library[index].previewImage !== undefined) definition.previewImage = workspace.library[index].previewImage;
      workspace.library[index] = definition;
    }
  }
}
export function sourceAvailable(definition) { return !!registry[definition?.sourceKey]; }
export function refreshSourceSnapshots(workspace) {
  function refresh(definition, data = {}) {
    if (definition.sourceKey) refreshSource(definition, data, registry[definition.sourceKey]);
    capturePartials(definition, workspace.library, data);
    for (const partial of definition.partials ?? []) refresh(partial);
  }
  for (const definition of workspace.library) {
    refresh(definition);
  }
  for (const template of workspace.templates) {
    for (const instance of template.instances) {
      refresh(instance.definition, instance.data);
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
  const files = ownFilesForDefinition(definition);
  if (!definition.partials?.length) return files;
  const entry = definition.sourceKey?.split('/').at(-1) ?? definition.exportName.slice(3) + (definition.kind === 'zvp' ? '.zvp.js' : '.zvc.js');
  const implementation = entry.replace(/\.zv[cp]\.js$/, '.implementation.js');
  files[implementation] = files[entry];
  files['resolve-partials.js'] = partialRendererSource;
  const imports = [];
  const registry = [];
  definition.partials.forEach((partial, index) => {
    const directory = '_partials/' + partial.exportName;
    const partialEntry = partial.sourceKey?.split('/').at(-1) ?? partial.exportName.slice(3) + '.zvp.js';
    for (const [path, content] of Object.entries(filesForDefinition(partial))) files[directory + '/' + path] = content;
    imports.push(`import partial${index} from ${JSON.stringify('./' + directory + '/' + partialEntry)};`);
    registry.push(`${JSON.stringify(partial.exportName)}: { buildNode(data = {}, params = {}) { return partial${index}.buildNode({ ...${JSON.stringify(dataFor(partial))}, ...data }, params); } }`);
  });
  files[entry] = `import source from ${JSON.stringify('./' + implementation)};
import { resolvePartials } from './resolve-partials.js';
${imports.join('\n')}
const partials = { ${registry.join(', ')} };
export default {
  ...source,
  buildNode(data = {}, params = {}) {
    return resolvePartials(source.buildNode(data, params), partials, params);
  }
};
`;
  return files;
}
function ownFilesForDefinition(definition) {
  if (!definition.sourceKey) {
    const files = componentFiles(definition);
    function needsSlots(nodes) {
      return nodes.some(node => ['OffCanvasTrigger', 'ZModalTrigger', 'Accordion', 'OffCanvas', 'ZModal'].includes(node.name) || needsSlots(node.children));
    }
    if (needsSlots(definition.tree)) {
      files['StudioComponentsRenderer.js'] = slotRendererSource;
      files['README.md'] = '# Zaux slot integration\n\nThis component uses direct trigger children or named content slots. Register the included renderer after Zaux setup, before mounting the app:\n\n```js\nimport StudioComponentsRenderer from "./StudioComponentsRenderer.js";\napp.component("ComponentsRenderer", StudioComponentsRenderer);\n```\n\nThe adapter uses your registered Zaux components. It is also required when consuming the runtime JSON tree. No Studio services are needed.\n';
    }
    return files;
  }
  if (!sourceAvailable(definition)) throw new Error('zx_builder_source_missing');
  const directory = prefix + definition.sourceKey.slice(0, definition.sourceKey.lastIndexOf('/') + 1);
  const sourceFiles = zauxSources[definition.sourceKey]?.files
    ?? localSourceFiles(directory, rawFiles);
  const files = Object.fromEntries(Object.entries(sourceFiles).sort(([a], [b]) => Number(/\.zv[cp]\.js$/.test(b)) - Number(/\.zv[cp]\.js$/.test(a)) || a.localeCompare(b)));
  const path = defaultPath(definition.sourceKey);
  if (Object.hasOwn(files, path.slice(directory.length))) files[path.slice(directory.length)] = 'export default ' + JSON.stringify(dataFor(definition), null, 2) + ';\n';
  // Include all configured values even when the module uses a custom defaults path.
  files['instance-data.json'] = JSON.stringify(dataFor(definition), null, 2);
  if (definition.css.trim()) files['style/Studio.css'] = definition.css;
  return files;
}
export function sourceCode(definition) {
  return definition.sourceKey
    ? zauxSources[definition.sourceKey]?.files[definition.sourceKey.split('/').at(-1)] ?? rawFiles[prefix + definition.sourceKey] ?? ''
    : Object.values(componentFiles(definition))[0];
}
