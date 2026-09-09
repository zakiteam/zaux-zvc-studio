# Data format and exports

## Canonical document

The workspace is plain JSON:

```js
{
  schemaVersion: 1,
  id, name, createdAt, updatedAt,
  library: [definition],
  templates: [{ id, name, instances: [instance] }]
}
```

A definition contains `id`, display `name`, valid `exportName` (such as ZVCFeatureSection), `fields`, `tree` and `css`.

```js
{
  id: 'stable-node-id',
  name: 'IntroText',
  props: {
    title: { $bind: 'title' },
    size: 'm'
  },
  children: []
}
```

Only an object with exactly one `$bind` key is a binding. Its value is a data key/path. Flat dotted keys have precedence over nested lookup, matching Zaux's getValue helper.

A field has `key`, `label`, `type` and `default`. Visual field types: text, textarea, number, switch, select and json. Native metadata also accepts html, css-editor, button, buttongroup and component, plus the original showIf conditions. Select fields add `options: [{ label, value }]`.

An instance contains `id`, `sourceId` (provenance only), `name`, a full independent `definition`, and a `data` object overriding that definition's defaults.

Native definitions additionally store sourceKey (relative to app/zvc) and defaults. Their tree is a cached result of buildNode, refreshed from the installed module and current instance data. Source functions are never stored in JSON. Missing modules retain their saved tree and require restoring the module or converting to visual before editing content.

## Transport envelope

`documentEnvelope(kind, data)` from `domain/export.js` returns:

```js
{
  format: 'zaux-builder',
  schemaVersion: 1,
  kind: 'workspace', // or component / template
  exportedAt: 'ISO timestamp',
  data: { /* corresponding document */ }
}
```

This is ready to POST as application/json. Supabase remote projects store the workspace document and schema version as JSON, with authentication, ownership, revisions, and conflict handling enforced by the project integration and database RLS policies. No arbitrary server or credentials are assumed.

`parseDocument` validates imports before changing state. A workspace replaces the session after a UI confirmation; a component/template is added with fresh IDs. The editable format is distinct from a rendered node snapshot.

## Zaux exports

A selected visual component exports a ZIP containing:
- `Component.zvc.js`: buildNode, defaults merge, gv bindings and renderNode.
- `Component.meta.js`: label, ZVCName, metadata and editable fields.
- `data/Component.defaults.js`: JSON-compatible default values.
- `style/Component.css`: present if authored CSS exists; include it in the destination stylesheet entry.

The root uses the original `ComponentsRenderer` with `props.components`, enabling nested default-slot children in ordinary Zaux consumers. No builder runtime or editor identifiers are required.

When exporting an instance as a component, its content overrides become export defaults. JSON workspace/template exports preserve the original split between defaults and instance overrides.

Native JS export preserves the original source folder, patches conventional defaults with current values and adds instance-data.json. See [native components](code-components.md) for portable source dependencies and conversion behavior.

For installation in another Zaux project, place the component folder under `project/components/virtual/`, include any CSS and regenerate its component index through that project's normal workflow. The builder itself never runs those scripts in its read-only submodule.

The component export dialog offers JSON Zaux for a runtime snapshot, alongside editable JSON and JavaScript. `runtimeRoot` and `templateRuntime` expose compiled snapshots for downstream JSON rendering. They intentionally resolve all bindings. Keep the editable envelope as the source for future editing.

## Invariants
- Browser save and transport share the same schema.
- Instance edits do not propagate to library or sibling instances.
- UI state, undo history and DOM annotations are not exported.
- No functions, eval or executable expressions inside JSON.
- Empty strings, false and zero are valid values.
- Changing this format requires a versioned migration, not a silent reset.

## Add a ZVC from JSON

In the Library, **ZVC from JSON** opens an editable definition example. Paste either a complete Studio definition (`id`, `name`, `exportName`, `fields`, `tree`, `css`) or a version 1 component envelope. The definition is validated before insertion; imports create independent IDs and copies through the standard library import path. Workspace/template envelopes and runtime snapshots are not accepted by this component-only action. Invalid drafts remain in the dialog for correction.

CodeMirror provides the shared JSON, CSS and JavaScript editor, including read-only export snippets. `BuilderCodeEditor` accepts `modelValue`, `language`, `label`, `rows`, `readonly` and `disabled`; it emits draft updates and commits on blur. JSON edits still use the existing parse/apply flow. Clear JSON writes `{}` for objects, `[]` for arrays and `null` for scalar JSON values; advanced node properties clear to `{}`. CSS fields use the CSS language mode.
