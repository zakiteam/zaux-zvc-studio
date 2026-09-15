import { clone, dataFor } from './nodes.js';
import { exportName } from './workspace.js';
import { documentEnvelope } from './export.js';
import { validateWorkspace } from './validation.js';
import { componentThemesCss } from './component-themes.js';
import { fontFiles } from './fonts.js';
import { presetCss, mergeUISettings } from './styles.js';

const json = value => JSON.stringify(value, null, 2) + '\n';

function uniqueName(base, used) {
  let name = base;
  for (let suffix = 2; used.has(name.toLowerCase()); suffix++) name = base + suffix;
  used.add(name.toLowerCase());
  return name;
}

// IDs and source-node provenance do not change an exported implementation.
function definitionKey(definition) {
  const tree = nodes => nodes.map(node => ({ name: node.name, props: node.props, children: tree(node.children) }));
  return JSON.stringify({
    exportName: definition.exportName, sourceKey: definition.sourceKey,
    fields: definition.fields, defaults: definition.defaults, css: definition.css,
    tree: definition.sourceKey ? undefined : tree(definition.tree)
  });
}

export function tokenFiles(styles, groups, documents) {
  const changed = {};
  const overrides = new Map((styles.cssVars ?? []).filter(group => group.selector === ':root')
    .flatMap(group => group.vars).map(variable => [variable.name, variable.value]));
  for (const group of groups) {
    for (const variable of group.variables) {
      const value = overrides.get(variable.name);
      if (value === undefined || value.trim() === String(variable.value).trim()) continue;
      const document = changed[group.file] ??= clone(documents[group.file]);
      const path = variable.tokenPath;
      const parent = path.slice(0, -1).reduce((object, key) => object[key], document);
      const channels = value.trim().split(/\s+/).map(Number);
      parent[path.at(-1)] = variable.type === 'color' && channels.length === 3
        && channels.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)
        ? '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('') : value;
    }
  }
  return Object.fromEntries(Object.entries(changed).map(([name, value]) => [`style/tokens/${name}.json`, json(value)]));
}

function templateFiles(template, name, blocks) {
  const directory = `project/templates/${name.toLowerCase()}`;
  const source = `export default {\n  id: ${JSON.stringify(template.id)},\n  name: ${JSON.stringify(template.name)},\n  blocks: (blockParams = {}) => ${JSON.stringify(blocks, null, 2)}\n};\n`;
  // Keep arbitrary template IDs out of the HTML source string.
  const story = `import TemplateRenderer from '@zx_core/storybook/components/TemplateRenderer.vue';
import templateDefinition from './${name}.tpl.js';

export default {
  title: ${JSON.stringify('Templates/' + name)},
  component: TemplateRenderer,
  argTypes: { highlightView: { control: { type: 'boolean' } } }
};

export const ${name} = (args) => ({
  components: { TemplateRenderer },
  setup() { return { args, templateName: templateDefinition.id }; },
  template: '<TemplateRenderer :templateName="templateName" v-bind="args" />'
});
${name}.args = { highlightView: false };
${name}.parameters = {
  paddings: { disable: true },
  controls: { disable: false },
  actions: { disable: true },
  a11y: { disable: false },
  storybookCodePanel: { disable: true },
  essentials: { disable: true },
  design: { disable: true },
  docs: { disable: true },
  layout: 'fullscreen'
};
`;
  return { [`${directory}/${name}.tpl.js`]: source, [`${directory}/${name}.stories.js`]: story };
}

export function starterFiles(workspace, { filesForComponent, tokenGroups, tokenDocuments, defaultUISettings, templateId }) {
  if (templateId !== undefined) {
    const template = workspace.templates.find(item => item.id === templateId);
    if (!template) throw new Error('zx_builder_invalid_document');
    workspace = { ...workspace, library: [], templates: [template] };
  }
  validateWorkspace(workspace);
  const files = {};
  const names = new Set();
  const definitions = new Map();
  const components = [];
  const templates = [];
  function addDefinition(definition) {
    const key = definitionKey(definition);
    if (definitions.has(key)) return definitions.get(key);
    const name = uniqueName(definition.exportName.slice(3), names);
    const exported = { ...clone(definition), exportName: 'ZVC' + name };
    const directory = `project/components/virtual/${name.toLowerCase()}`;
    const componentFiles = filesForComponent(exported);
    componentFiles[`data/${name}.defaults.js`] = 'export default ' + json(dataFor(exported)).trimEnd() + ';\n';
    for (const [path, content] of Object.entries(componentFiles)) files[`${directory}/${path}`] = content;
    definitions.set(key, exported.exportName);
    components.push({ name: exported.exportName, originalName: definition.exportName, directory });
    return exported.exportName;
  }
  workspace.library.forEach(addDefinition);
  const templateNames = new Set();
  for (const template of workspace.templates) {
    const base = exportName(template.name).slice(3);
    const name = uniqueName(/^[A-Za-z]/.test(base) ? base : 'Template' + base, templateNames);
    const blocks = template.instances.map(instance => ({
      blockName: addDefinition(instance.definition), data: clone(instance.data)
    }));
    Object.assign(files, templateFiles(template, name, blocks));
    templates.push({ id: template.id, name, directory: `project/templates/${name.toLowerCase()}` });
  }
  const styles = workspace.styles ?? { cssVars: [], uiSettings: {} };
  Object.assign(files, tokenFiles(styles, tokenGroups, tokenDocuments), fontFiles(styles.fonts));
  const css = presetCss(styles);
  if (css) files['style/studio-tokens.css'] = css;
  const themeCss = componentThemesCss(workspace.componentThemes);
  if (themeCss) files['style/component-themes.css'] = themeCss;
  if (Object.keys(styles.uiSettings ?? {}).length) {
    files['style/ui.config.js'] = 'export default ' + json(mergeUISettings(defaultUISettings, styles.uiSettings)).trimEnd() + ';\n';
  }
  files['studio/workspace.json'] = json(documentEnvelope('workspace', workspace));
  files['studio/manifest.json'] = json({ components, templates });
  const cssPaths = Object.keys(files).filter(path => /\.(css|scss)$/.test(path));
  files['README.md'] = `# Zaux project starter

Copy this package into a compatible Zaux repository. Zaux, its core components, build configuration and dependencies must already be installed.

- Components: project/components/virtual/<name> (the standard Zaux path).
- Templates: project/templates/<name>, including TemplateRenderer stories.
- Run the destination project's normal component/template index generation and stylesheet setup. Review existing files before replacing them.
- style/tokens/*.json contains complete upstream token documents with the edited values applied, only for changed categories. Preserve your destination project's unrelated token changes when merging.
- Load style/studio-tokens.css, when present, after Zaux styles to retain all authored variables, including custom selectors and variables that have no token mapping.
- Load style/component-themes.css, when present, after the original component styles.
- style/ui.config.js, when present, contains the effective Zaux UI configuration.
- Add fonts.html links to the page head; fonts.json lists the project font references. Font binaries and media are referenced by URL, not bundled.
- studio/workspace.json retains the editable Studio project; studio/manifest.json maps generated names and folders.

## Independent components

Library definitions and template copies with different implementations/configuration receive distinct names. Template data remains attached to each block. Identical definitions share an export. Numeric suffixes avoid case-insensitive name collisions.

Native modules retain their original files under source/. A small ZVC entry applies the exported defaults and metadata without rewriting their implementation. Imports outside that source folder remain dependencies to integrate in the destination repository.

If a component includes StudioComponentsRenderer.js, register that adapter as ComponentsRenderer after Zaux setup and before mounting, as described in its component README.

## Styles to include

${cssPaths.length ? cssPaths.map(path => '- ' + path).join('\n') : 'No authored component or token CSS.'}
`;
  return files;
}

export function nativeStarterFiles(definition, sourceFiles) {
  const name = definition.exportName.slice(3);
  const entry = definition.sourceKey.split('/').at(-1);
  const meta = { builder: true, label: definition.name, ZVCName: definition.exportName, fields: definition.fields };
  return {
    ...Object.fromEntries(Object.entries(sourceFiles).map(([path, content]) => ['source/' + path, content])),
    [`${name}.meta.js`]: 'export default ' + json(meta).trimEnd() + ';\n',
    [`data/${name}.defaults.js`]: 'export default ' + json(dataFor(definition)).trimEnd() + ';\n',
    [`${name}.zvc.js`]: `import source from './source/${entry}';
import meta from './${name}.meta.js';
import defaults from './data/${name}.defaults.js';

export default {
  ...source,
  ...meta,
  buildNode(data = {}, params = {}) {
    const node = source.buildNode({ ...defaults, ...data }, params);
    return Array.isArray(node) ? node : node && { ...node, ZVCName: meta.ZVCName };
  }
};
`
  };
}
