import { phpModel, phpPageModel } from './model.js';
import { phpProfile } from './profile.js';
import { emitComponent, emitPage, emitReadme, repeaterKeys } from './emit.js';
import { phpValue } from './printer.js';
import { validateWorkspace } from '../validation.js';

// Same rule as uniqueName in domain/starter-export.js: case-insensitive, numeric suffix.
function uniqueName(base, used) {
  let name = base;
  for (let suffix = 2; used.has(name.toLowerCase()); suffix++) name = base + suffix;
  used.add(name.toLowerCase());
  return name;
}

// PHP export of ZVCs/ZVPs, templates and whole projects for themes based on
// zaux-wp-core: workspace JSON -> model (model.js) -> files (emit.js + the
// templates in profile.js). Layout: {name}/ for each ZVC (theme components/base/),
// _partials/{name}/ (theme components/_partials/), page-templates/ (theme root).
// Every component function returns the Zaux runtime node built from `$data`
// over the component defaults, the same JSON as the JS buildNode.
//
// options: {
//   profile?: overrides merged into DEFAULT_PHP_PROFILE,
//   readme?: include README.md (default false),
//   acf?: include the ACF bridge <Name>.acf.php of each ZVC (default true),
//   partials?: include the _partials/ folder (default true). Without it ZVPs keep
//     their name and calls but no files, for themes that already have them; the
//     main component of a single ZVP export is still written.
// }

export { phpProfile, DEFAULT_PHP_PROFILE } from './profile.js';
export { phpModel, phpPageModel } from './model.js';

function createAssembler(options = {}) {
  const profile = phpProfile(options.profile);
  const acf = options.acf !== false;
  const withPartials = options.partials !== false;
  const files = {};
  // Equal models share one component; different copies that share an export
  // name get a numeric suffix (instances are independent copies). Names are
  // unique across base and _partials, as zaux-wp-core requires.
  const placed = new Map();
  const names = new Set();
  const pageNames = new Set();
  // Writes a component once, with the partials it calls (ZVP files only with withPartials or as main).
  function place(model, { main = false } = {}) {
    // Like definitionKey in domain/starter-export.js, the display name does not
    // make two implementations different.
    const signature = JSON.stringify({ ...model, label: undefined });
    if (placed.has(signature)) return placed.get(signature);
    const name = uniqueName(profile.naming.component(model), names);
    const dir = profile.paths.componentDir(model, name);
    const unit = { name, kind: model.kind, exportName: model.exportName, fn: profile.naming.function(model, name), entry: dir + profile.paths.entry(model, name) };
    placed.set(signature, unit);
    try {
      const partials = model.partials.map(partial => ({ exportName: partial.exportName, fn: place(partial).fn }));
      if (main || model.kind !== 'zvp' || withPartials) Object.assign(files, emitComponent({ model, name, fn: unit.fn, dir, partials }, profile, { acf, unitOf: place }).files);
    } catch (error) {
      // Partials already written stay valid for the other components.
      placed.delete(signature);
      names.delete(name.toLowerCase());
      throw error;
    }
    return unit;
  }
  // A page template calling its components in order with their Studio data.
  function page(template) {
    const model = phpPageModel(template);
    const entries = model.instances.flatMap(instance => {
      if (instance.free) return instance.nodes.map(node => ({ label: instance.name, node }));
      const unit = place(instance.model);
      const partials = instance.model.partials.map(partial => ({ exportName: partial.exportName, fn: place(partial).fn }));
      return [{ label: instance.name, fn: unit.fn, data: instance.data, partials, repeaters: repeaterKeys(instance.model) }];
    });
    const name = uniqueName(profile.naming.page(model), pageNames);
    const result = { name, path: profile.paths.page(name) };
    files[result.path] = emitPage({ template: model, entries }, profile);
    return result;
  }
  function finish(summary) {
    if (options.readme) files[profile.paths.readme()] = emitReadme(profile, summary, files);
    return { files, ...summary };
  }
  return { profile, files, place, page, finish };
}

// One ZVC/ZVP with the partials it calls, in the theme layout.
export function phpComponentExport(definition, options) {
  const assembler = createAssembler(options);
  const main = assembler.place(phpModel(definition), { main: true });
  return assembler.finish({ main, components: [main], pages: [] });
}

// A template (page): its components plus the page template file.
export function phpTemplateExport(template, options) {
  const assembler = createAssembler(options);
  const page = assembler.page(template);
  return assembler.finish({ main: null, components: [], pages: [page] });
}

// Project package, the PHP counterpart of the Zaux starter package: selected
// library ZVC/ZVPs plus selected templates (whose instances export their own
// independent copies). options.definitionIds / templateIds narrow the
// selection; omitted lists include everything.
export function phpProjectExport(workspace, options = {}) {
  validateWorkspace(workspace);
  const assembler = createAssembler(options);
  const included = (ids, id) => !ids || ids.includes(id);
  const components = workspace.library
    .filter(definition => included(options.definitionIds, definition.id))
    .map(definition => assembler.place(phpModel(definition)));
  const pages = workspace.templates
    .filter(template => included(options.templateIds, template.id))
    .map(template => assembler.page(template));
  return assembler.finish({ main: components[0] ?? null, components, pages });
}

// A list of definitions (e.g. the ZVC/ZVPs of an uploaded components/virtual
// folder, see sources.js). A definition that cannot be exported is reported in
// `errors`; the others are exported normally.
export function phpDefinitionsExport(definitions, options = {}) {
  const assembler = createAssembler(options);
  const components = [];
  const errors = [];
  for (const definition of definitions) {
    try {
      components.push({ id: definition.id, ...assembler.place(phpModel(definition)) });
    } catch (error) {
      errors.push({ id: definition.id, message: error?.message ?? String(error) });
    }
  }
  return assembler.finish({ main: components[0] ?? null, components, pages: [], errors });
}

// One element as a PHP array literal: bindings read `$gv`, as inside the
// generated component function (snippet, no files).
export function phpNodeSnippet(node, options = {}) {
  const profile = phpProfile(options.profile);
  return `$node = ${phpValue(node, { profile })};\n`;
}
