// PHP export profile: the one place to retouch how the PHP export is composed.
// The export mirrors the JavaScript ZVC/ZVP files (componentFiles in
// domain/export.js): an entry file whose function returns the Zaux runtime
// node, plus meta and defaults files. Naming, file layout and the text of each
// file live here; the model (model.js), the value printer (printer.js) and the
// assembly (index.js) do not need changes to reshape the output.
// A profile is code configuration (functions allowed), never persisted data.

const snake = value => String(value)
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
  .replace(/[^A-Za-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .toLowerCase() || 'component';
const kebab = value => snake(value).replace(/_/g, '-');

// Template helpers receive `p` (pieces prepared by emit.js):
//   p.fn, p.exportName, p.name (file base name), p.label, p.kind ('zvc'|'zvp'), p.native, p.snapshot,
//   p.header(lines), p.namespace, p.requires, p.metaPath, p.defaultsPath,
//   p.php(value, depth) (JSON -> PHP literal, $bind/$spread -> $data reads; use depth 0 inside p.indent),
//   p.root (runtime root JSON with markers), p.partials ([{ exportName, fn }]),
//   p.ref(fn) (callable string for a function), p.guard(fn, body), p.indent(text, levels),
//   p.helpers (helper function names), p.returns ('array' | 'json'),
//   p.externalHelpers (helper file name when it is not in the export, else null),
//   page template only: p.entries ([{ code, component, label }]); meta/defaults: p.value.
export const DEFAULT_PHP_PROFILE = {
  // Bump when the generated contract changes; printed in every file header.
  version: 1,
  // Optional PHP namespace (e.g. 'Theme\\Zaux'); empty keeps global functions.
  namespace: '',
  // Wrap functions in `if (!function_exists(...))` so files can be loaded twice.
  guard: true,
  // 'array': functions return the node as a PHP array (json_encode it yourself);
  // 'json': functions return the JSON string.
  returns: 'array',
  // Literal used for empty JSON objects, so json_encode() keeps `{}` instead of `[]`.
  emptyObject: '(object) []',
  indent: '    ',

  naming: {
    // Function of a ZVC/ZVP, like the JS module default export.
    component: model => 'zaux_' + snake(model.exportName),
    // Function of a template (page) export.
    page: template => 'zaux_page_' + snake(template.name),
    // File base name, as in the JS export (ZVCHero -> Hero.zvc.php).
    file: model => model.exportName.replace(/^ZV[CP]/, '') || 'Component',
    snake,
    kebab
  },

  // File layout relative to a component directory, mirroring the JS export.
  paths: {
    helpers: () => 'zvc-helper.php',
    entry: (model, name) => `${name}.${model.kind}.php`,
    meta: (model, name) => `${name}.meta.php`,
    defaults: (model, name) => `data/${name}.defaults.php`,
    css: (model, name) => `style/${name}.css`,
    // Partial copies live inside their owner, like `_partials/<ExportName>/` in JS.
    partialDir: partial => `_partials/${partial.exportName}/`,
    // Package and template exports. `name` follows the Zaux starter package
    // (domain/starter-export.js): export name without ZVC/ZVP, numeric suffix
    // when taken; folders use it in lowercase, exactly like the JS package.
    packageComponentDir: (model, name) => (model.kind === 'zvp' ? 'components/_partials/' : 'components/') + name.toLowerCase() + '/',
    packagePage: (template, name) => 'templates/' + name.toLowerCase() + '.php',
    readme: () => 'README.md'
  },

  // Runtime helper names; their bodies are in templates.helpers.
  helpers: {
    getValue: 'zaux_gv',
    spread: 'zaux_spread',
    renderNode: 'zaux_render_node',
    resolvePartials: 'zaux_resolve_partials'
  },

  // Metadata file content, as `<Name>.meta.js` in the JS export.
  meta: model => ({
    builder: true,
    label: model.label,
    [model.kind === 'zvp' ? 'ZVPName' : 'ZVCName']: model.exportName,
    meta: { version: 1 },
    fields: model.fields
  }),

  // Node built by the function, before renderNode: the ZVC root mirrors
  // `componentFiles` (ComponentsRenderer over the tree), a ZVP returns its only
  // node or a ComponentsRenderer wrapper.
  shape: {
    zvc: (model, nodes) => ({ name: 'ComponentsRenderer', props: { components: nodes } }),
    zvp: (model, nodes) => nodes.length === 1 ? nodes[0] : { name: 'ComponentsRenderer', props: { components: nodes } }
  },

  templates: {
    // Entry file: the PHP counterpart of `<Name>.zvc.js` / `<Name>.zvp.js`.
    component: p => `${p.header([
      `${p.label} (${p.exportName}): PHP counterpart of ${p.name}.${p.kind}.js.`,
      `${p.fn}() returns the Zaux runtime node (${p.returns === 'json' ? 'JSON string' : 'array, json_encode() it'}) for ComponentsRenderer.`,
      ...(p.native ? ['', 'Native ZVC/ZVP: its JavaScript buildNode logic is not translated. The structure is', 'rendered with the configured data; field values that pass through unchanged read $data.'] : []),
      ...(p.snapshot ? ['Module unavailable: static snapshot with literal values.'] : []),
      ...(p.externalHelpers ? ['', `Needs the ${p.helpers.renderNode}/${p.helpers.getValue} helpers of ${p.externalHelpers}, loaded once by the project.`] : [])
    ])}${p.namespace}
${p.requires}

${p.guard(p.fn, `/**
 * @param array $data Field values; missing keys use data/${p.name}.defaults.php.
 * @param array $params Render params, forwarded to partials.
 * @return ${p.returns === 'json' ? 'string' : 'array'}
 */
function ${p.fn}(array $data = [], array $params = [])
{
${p.indent(`$meta = require __DIR__ . '/${p.metaPath}';
$defaults = require __DIR__ . '/${p.defaultsPath}';
$data = array_replace($defaults, $data);

$node = ${p.php(p.root, 0)};

$nodeObject = [${p.kind === 'zvc' ? `'meta' => ['ZVCName' => $meta['ZVCName']], ` : ''}'node' => $node];
$partials = ${p.partials.length ? `[\n${p.partials.map(item => `    ${p.php(item.exportName, 0)} => ${p.ref(item.fn)},`).join('\n')}\n]` : '[]'};

return ${p.helpers.renderNode}($nodeObject, $data, $params, $partials${p.returns === 'json' ? ', true' : ''});`, 1)}
}`)}
`,

    // Metadata and defaults files: plain `return` of a PHP array.
    meta: p => `<?php\n// ${p.label} (${p.exportName}): metadata, as ${p.name}.meta.js.\nreturn ${p.php(p.value, 0)};\n`,
    defaults: p => `<?php\n// ${p.label} (${p.exportName}): default field values, as data/${p.name}.defaults.js.\nreturn ${p.php(p.value, 0)};\n`,

    // Page file: every component of the template with the data configured in the Studio.
    page: p => `${p.header([`Page "${p.label}": the list of Zaux runtime nodes, in order.`])}${p.namespace}
${p.requires}

${p.guard(p.fn, `/**
 * @param array $params Render params, forwarded to the components.
 * @return ${p.returns === 'json' ? 'string' : 'array'}
 */
function ${p.fn}(array $params = [])
{
${p.indent(`$nodes = [
${p.entries.map(entry => p.indent(`${entry.component && p.returns === 'json' ? `json_decode(${entry.code}, true)` : entry.code}, // ${entry.label}`, 1)).join('\n')}
];

return ${p.returns === 'json' ? 'json_encode($nodes, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)' : '$nodes'};`, 1)}
}`)}
`
  }
};

export function phpProfile(overrides = {}) {
  const result = { ...DEFAULT_PHP_PROFILE };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    const base = DEFAULT_PHP_PROFILE[key];
    result[key] = base && typeof base === 'object' && !Array.isArray(base) && value && typeof value === 'object' && !Array.isArray(value)
      ? { ...base, ...value }
      : value;
  }
  return result;
}
