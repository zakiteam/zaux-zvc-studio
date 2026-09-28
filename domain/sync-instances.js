import { clone } from './nodes.js';
import { restoreInstance } from './restore-instance.js';

// Explicit propagation only: ordinary library edits keep copies independent.
export function syncLibraryInstances(workspace, source) {
  const original = clone(source);
  function syncPartials(owner, data = {}) {
    for (const variant of owner.variants ?? []) {
      if (variant.content) syncPartials(variant.content, data);
    }
    for (const partial of [...(owner.partials ?? [])]) {
      if ((partial.libraryId ?? partial.id) !== original.id) {
        syncPartials(partial);
        continue;
      }
      const references = new Set();
      function visit(value) {
        if (!value || typeof value !== 'object') return;
        Object.values(value).forEach(visit);
        if (value.name === partial.exportName && value.props && typeof value.props === 'object') references.add(value);
      }
      // Source snapshots are regenerated at commit; only authored data is mutable.
      if (!owner.sourceKey) visit(owner.tree);
      visit(owner.defaults);
      for (const field of owner.fields ?? []) visit(field.default);
      visit(data);
      const names = new Set([owner.exportName, ...workspace.library.map(item => item.exportName), ...owner.partials.map(item => item.exportName)]);
      function restore(props) {
        const restored = restoreInstance({ definition: partial, data: props }, original);
        restored.definition.libraryId = original.id;
        restored.definition.exportName = partial.exportName;
        return restored;
      }
      // Keep the captured name for native references generated from source too.
      let first = true;
      for (const reference of references) {
        const restored = restore(reference.props);
        if (first) owner.partials.splice(owner.partials.indexOf(partial), 1, restored.definition);
        else {
          for (let suffix = 2; names.has(restored.definition.exportName); suffix++) restored.definition.exportName = original.exportName + suffix;
          owner.partials.push(restored.definition);
        }
        names.add(restored.definition.exportName);
        reference.name = restored.definition.exportName;
        reference.props = restored.data;
        first = false;
      }
      if (first) owner.partials.splice(owner.partials.indexOf(partial), 1, restore({}).definition);
    }
  }
  if (original.kind === 'zvp') {
    for (const definition of workspace.library) {
      if (definition.id !== original.id) syncPartials(definition);
    }
  }
  for (const template of workspace.templates) {
    for (const instance of template.instances) {
      if (instance.sourceId === original.id) Object.assign(instance, restoreInstance(instance, original));
      else if (original.kind === 'zvp') syncPartials(instance.definition, instance.data);
    }
  }
}
