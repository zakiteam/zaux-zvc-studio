import { capturePartials } from '../partials.js';
import { withSourceModules } from '../source-runtime.js';
import { definitionFromSource } from '../source-zvc.js';
import { phpDefinitionsExport } from './index.js';

// PHP conversion of native ZVC/ZVP modules that are not bundled with the Studio
// (e.g. the components/virtual folder of a Zaux project uploaded as a ZIP).
// It is the same pipeline as the library ZVC/ZVPs: definitionFromSource ->
// capturePartials -> phpModel (sentinel bindings) -> profile templates.
// The modules are visible to the source registry only while converting.
//
// entries: [{ key, module, defaults }] with `key` the source path ending in
// .zvc.js / .zvp.js; options as phpDefinitionsExport.
// Returns { files, components: [{ key, name, kind, fn, entry }], errors: [{ key, message }] }.
export function phpSourceExport(entries, options = {}) {
  const modules = Object.fromEntries(entries.map(entry => [entry.key, entry.module]));
  const keyOf = id => String(id).replace(/^source:/, '');
  const message = error => error?.message ?? String(error);
  return withSourceModules(modules, () => {
    const errors = [];
    const definitions = [];
    for (const entry of entries) {
      try { definitions.push(definitionFromSource(entry.key, entry.module, entry.defaults ?? {})); }
      catch (error) { errors.push({ key: entry.key, message: message(error) }); }
    }
    // ZVP references between the uploaded components, captured as in the Studio.
    const ready = definitions.filter(definition => {
      try { capturePartials(definition, definitions); return true; }
      catch (error) { errors.push({ key: keyOf(definition.id), message: message(error) }); return false; }
    });
    const result = phpDefinitionsExport(ready, options);
    return {
      ...result,
      components: result.components.map(({ id, ...unit }) => ({ key: keyOf(id), ...unit })),
      errors: [...errors, ...result.errors.map(({ id, ...error }) => ({ key: keyOf(id), ...error }))]
    };
  });
}
