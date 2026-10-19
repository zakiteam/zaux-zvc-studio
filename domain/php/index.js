import { phpModel, phpPageModel } from './model.js';
import { phpProfile } from './profile.js';
import { emitComponent, emitHelpers, emitPage, emitReadme } from './emit.js';
import { phpValue } from './printer.js';
import { validateWorkspace } from '../validation.js';
import { exportName } from '../workspace.js';

// Same rule as uniqueName in domain/starter-export.js: case-insensitive, numeric suffix.
function uniqueName(base, used) {
  let name = base;
  for (let suffix = 2; used.has(name.toLowerCase()); suffix++) name = base + suffix;
  used.add(name.toLowerCase());
  return name;
}

// PHP export of ZVCs/ZVPs, templates and whole projects, the counterpart of the
// JavaScript export: workspace JSON -> model (model.js) -> files (emit.js + the
// templates in profile.js). Every function returns the Zaux runtime node ("a
// piece of JSON") built from `$data` over the component defaults.
//
// options: {
//   profile?: overrides merged into DEFAULT_PHP_PROFILE,
//   helpers?: include zvc-helper.php (default false: load it once elsewhere;
//             generated files then do not require it),
//   readme?: include README.md (default false)
// }

export { phpProfile, DEFAULT_PHP_PROFILE } from './profile.js';
export { phpModel, phpPageModel } from './model.js';

function createAssembler(options = {}) {
  const profile = phpProfile(options.profile);
  const helpersPath = profile.paths.helpers();
  const context = { profile, helpersPath: options.helpers ? helpersPath : null };
  const files = options.helpers ? { [helpersPath]: emitHelpers(profile, helpersPath) } : {};
  // Equal models share one function and one directory; different copies that
  // share an export name get a numeric suffix (instances are independent copies).
  const bySignature = new Map();
  const taken = new Set();
  const placed = new Map();
  // Folder names of placed components and pages, as in the Zaux starter package.
  const componentNames = new Set();
  const templateNames = new Set();
  function functionName(model) {
    // Like definitionKey in domain/starter-export.js, the display name does not
    // make two implementations different.
    const signature = JSON.stringify({ ...model, label: undefined });
    if (bySignature.has(signature)) return bySignature.get(signature);
    const base = profile.naming.component(model);
    let fn = base;
    for (let index = 2; taken.has(fn); index++) fn = `${base}_${index}`;
    taken.add(fn);
    bySignature.set(signature, fn);
    return fn;
  }
  // Writes a component and, inside its directory, the partial copies it uses.
  // `name` overrides the file base name (renamed duplicates in packages).
  function component(model, dir = '', name = profile.naming.file(model)) {
    const partials = model.partials.map(partial => ({
      exportName: partial.exportName,
      ...component(partial, dir + profile.paths.partialDir(partial))
    }));
    const fn = functionName(model);
    const unit = emitComponent({ model, fn, dir, name, partials }, context);
    Object.assign(files, unit.files);
    return { fn, entry: unit.entry };
  }
  // Writes a component once, in the directory named like the JS package does.
  function place(model, dirFor) {
    const fn = functionName(model);
    if (!placed.has(fn)) {
      const name = uniqueName(model.exportName.slice(3) || 'Component', componentNames);
      placed.set(fn, component(model, dirFor(model, name), name));
    }
    return placed.get(fn);
  }
  // A page function calling its components in order with their Studio data.
  function page(template, dirFor, pathFor) {
    const model = phpPageModel(template);
    const requires = [];
    const entries = model.instances.flatMap(instance => {
      if (instance.free) return instance.nodes.map(node => ({ label: instance.name, node }));
      const unit = place(instance.model, dirFor);
      requires.push(unit.entry);
      return [{ label: instance.name, fn: unit.fn, data: instance.data }];
    });
    const fn = profile.naming.page(model);
    const base = exportName(model.name).slice(3);
    const name = uniqueName(/^[A-Za-z]/.test(base) ? base : 'Template' + base, templateNames);
    const result = { template: model, fn, path: pathFor(model, name), requires, entries };
    files[result.path] = emitPage(result, context);
    return { fn, path: result.path };
  }
  function finish(summary) {
    if (options.readme) files[profile.paths.readme()] = emitReadme({ ...context, files }, summary);
    return { files, ...summary };
  }
  return { profile, files, component, place, page, finish };
}

// One ZVC/ZVP with its partials: same layout as the JS component export.
export function phpComponentExport(definition, options) {
  const assembler = createAssembler(options);
  const main = assembler.component(phpModel(definition));
  return assembler.finish({ main, pages: [] });
}

// A template (page): the package layout restricted to that template, like
// the JS template export.
export function phpTemplateExport(template, options) {
  const assembler = createAssembler(options);
  const { paths } = assembler.profile;
  const page = assembler.page(template, paths.packageComponentDir, paths.packagePage);
  return assembler.finish({ main: null, pages: [page] });
}

// Project package, the PHP counterpart of the Zaux starter package: selected
// library ZVC/ZVPs plus selected templates (whose instances export their own
// independent copies). options.definitionIds / templateIds narrow the
// selection; omitted lists include everything.
export function phpProjectExport(workspace, options = {}) {
  validateWorkspace(workspace);
  const assembler = createAssembler(options);
  const { paths } = assembler.profile;
  const included = (ids, id) => !ids || ids.includes(id);
  const components = workspace.library
    .filter(definition => included(options.definitionIds, definition.id))
    .map(definition => assembler.place(phpModel(definition), paths.packageComponentDir));
  const pages = workspace.templates
    .filter(template => included(options.templateIds, template.id))
    .map(template => assembler.page(template, paths.packageComponentDir, paths.packagePage));
  return assembler.finish({ main: components[0] ?? null, pages });
}

// One element as a PHP array literal: bindings read `$data`, as inside the
// generated component function (snippet, no files).
export function phpNodeSnippet(node, options = {}) {
  const profile = phpProfile(options.profile);
  return `$node = ${phpValue(node, { profile })};\n`;
}
