import { localSourceFiles } from '../../domain/source-files.js';
import partialRendererSource from '../../integrations/zaux/renderers/partial-renderer.js?raw';
import { registerSourceModules } from '../../domain/source-runtime.js';
import { capturePartials, mergePartialAliases } from '../../domain/partials.js';
import { clone, dataFor } from '../../domain/nodes.js';
import { activeDefinitionOnly } from '../../domain/variants.js';
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
    // After the nested scopes, so copies that differed only in nested aliases compare equal.
    mergePartialAliases(definition, workspace.library, data);
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
  definition = activeDefinitionOnly(definition);
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
// IDs, labels and provenance do not make two partial copies different.
function partialSignature(definition) {
  const tree = nodes => nodes.map(node => ({ name: node.name, props: node.props, children: tree(node.children ?? []) }));
  return JSON.stringify({
    exportName: definition.exportName, sourceKey: definition.sourceKey, fields: definition.fields, defaults: definition.defaults, css: definition.css,
    tree: definition.sourceKey ? undefined : tree(definition.tree ?? []),
    partials: (definition.partials ?? []).map(partial => partialSignature(activeDefinitionOnly(partial)))
  });
}
// Import path between two package folders ("name/", "_partials/name/"), without ".js".
function relativeImport(from, to) {
  const a = from.split('/').filter(Boolean);
  const b = to.split('/').filter(Boolean);
  let common = 0;
  while (common < a.length && common < b.length - 1 && a[common] === b[common]) common++;
  return '../'.repeat(a.length - common) + b.slice(common).join('/').replace(/\.js$/, '');
}

// JavaScript package of one ZVC/ZVP in the Zaux layout: `<name>/` for the component and
// `_partials/<name>/` for every ZVP it uses, nested ones included (flattened, equal copies
// shared, names unique). Visual components import their partials and call them directly
// (componentFiles `calls`); native sources keep their own files (filesForDefinition).
// options.partials false skips the _partials/ files (imports stay, the destination project
// must provide them); options.styles false skips the style/ CSS files.
export function componentPackage(definition, { partials = true, styles = true } = {}) {
  const files = {};
  const names = new Set();
  const placed = new Map();
  function uniqueName(raw) {
    const base = raw.replace(/[^A-Za-z0-9_]/g, '') || 'Component';
    let name = base;
    for (let suffix = 2; names.has(name.toLowerCase()); suffix++) name = base + suffix;
    names.add(name.toLowerCase());
    return name;
  }
  // isPartial: a dependency (skipped without options.partials); a selected ZVP is the main unit.
  function place(source, isPartial) {
    const active = activeDefinitionOnly(source);
    const signature = isPartial ? partialSignature(active) : null;
    if (signature && placed.has(signature)) return placed.get(signature);
    const name = uniqueName(active.exportName.replace(/^ZV[CP]/, ''));
    const prefix = active.kind === 'zvp' ? 'ZVP' : 'ZVC';
    const folder = (active.kind === 'zvp' ? '_partials/' : '') + name.toLowerCase() + '/';
    const entry = active.sourceKey ? active.sourceKey.split('/').at(-1) : `${name}.${active.kind === 'zvp' ? 'zvp' : 'zvc'}.js`;
    const unit = { id: prefix + name, folder, entry };
    if (signature) placed.set(signature, unit);
    let own;
    if (active.sourceKey) own = filesForDefinition(active);
    else {
      const calls = new Map((active.partials ?? []).map(partial => {
        const child = place(partial, true);
        return [partial.exportName, { id: child.id, path: relativeImport(folder, child.folder + child.entry) }];
      }));
      own = ownFilesForDefinition({ ...active, exportName: unit.id }, { calls });
    }
    if (isPartial && !partials) return unit;
    for (const [path, content] of Object.entries(own)) {
      if (!styles && path.startsWith('style/')) continue;
      files[folder + path] = content;
    }
    return unit;
  }
  const main = place(definition, false);
  // The selected component first (export preview), then its partials.
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => Number(b.startsWith(main.folder)) - Number(a.startsWith(main.folder))));
}
function ownFilesForDefinition(definition, options = {}) {
  if (!definition.sourceKey) {
    const files = componentFiles(definition, options);
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
