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

## Image references

Optional `workspace.coverImage` and `definition.previewImage` strings store absolute public image URLs. Empty strings clear previews. Existing version-1 documents remain valid without these optional fields. Preview metadata survives editable JSON export/import and independent definition copies; source-library refresh preserves its own preview. Component image properties keep ordinary strings, with no binary data or media service objects in workspace JSON. Runtime/JS exports keep image URLs and do not bundle files.

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

In the Library, **ZVC from JSON** opens an editable definition example. Paste either a complete Studio definition (`id`, `name`, `exportName`, `fields`, `tree`, `css`) or a version 1 component envelope. The definition is validated before insertion; imports create independent IDs and copies through the standard library import path. Workspace/template envelopes are not accepted by this component-only action. Both **ZVC from JSON** and **Import** also accept a single Zaux node with `name` and an object `props`, plus an optional `children` array of nodes in the same format. The node becomes a visual library definition with generated IDs, an export name derived from its component name, empty fields and empty CSS. Props retain their JSON values, including false, zero, empty strings and null. Existing Studio binding-marker semantics still apply. This does not import component implementation code: `name` must identify a component available to the renderer or a supported HTML tag. Use strict JSON with quoted keys and no trailing commas. Invalid drafts remain in the dialog for correction.

CodeMirror provides the shared JSON, CSS and JavaScript editor, including read-only export snippets. `BuilderCodeEditor` accepts `modelValue`, `language`, `label`, `rows`, `readonly` and `disabled`; it emits draft updates and commits on blur. JSON edits still use the existing parse/apply flow. Clear JSON writes `{}` for objects, `[]` for arrays and `null` for scalar JSON values; advanced node properties clear to `{}`. CSS fields use the CSS language mode.

## Textarea and rich text editing

Textarea fields (including native HTML fields) offer **Text / HTML** and **Rich text** modes through `BuilderValue`. The raw textarea remains the default. Changing mode does not emit a new value; visual edits store an HTML string in the same field, without changing the document schema or field metadata. The source mode exposes that HTML without stripping formatting. Rendering formatted content requires a component property that supports HTML; plain-text properties still display text literally.

`BuilderRichTextEditor` loads Tiptap lazily and provides grouped icon controls for bold, italic, underline, strike, headings, quotes, lists, clearing marks and local undo/redo. Icons use the Zaux button/icon components with a project-owned SVG sprite. TableKit adds 3-by-3 tables with a header row and contextual row/column insertion and deletion, header toggling, cell merging/splitting and table deletion. Table commands are enabled according to the current selection. Table elements and structural attributes survive HTML sanitization; styling remains owned by the rendering component in the preview. Plain-text line breaks are preserved on entry. DOMPurify filters initial HTML, pasted HTML and emitted HTML using a small formatting allowlist. Editing visually normalizes unsupported markup; retain source mode for arbitrary HTML. Empty rich text stores an empty string. Disabled fields stay non-editable, external value changes reset local editor history, and native field controls remount when selecting another definition. Editor instances and mode preferences are not persisted in workspace JSON.

Dependencies follow the [official Tiptap Vue integration](https://tiptap.dev/docs/editor/getting-started/install/vue3). Runtime behavior is pending manual browser verification; no automated tests or production builds were run for this change.

The additional **HTML** mode uses CodeMirror syntax highlighting and indentation while editing. **Format HTML** explicitly formats and commits the source using lazily loaded Prettier with strict whitespace sensitivity. Switching views never auto-formats the saved value. Invalid HTML stays editable, and stale formatting results are discarded when the field or view changes.

## Restore an instance from the library

The selected instance in Structure exposes **Restore from library**. Its `sourceId` selects the original library definition; a missing source disables the action. The replacement is independent and goes through normal undo, validation and persistence.

Restoration retains effective data values and visual node properties, including false, zero, empty strings, null and obsolete data keys. Library structure and CSS replace the instance structure and CSS. Class/style properties (including nested class/style settings and CSS-editor fields) use library values. Arrays retain authored content and use library styling at corresponding positions. New fields use library defaults. Native instances regenerate from their preserved data; generated nodes are not patched.

Copied visual nodes carry optional `sourceNodeId` provenance. Matching requires a unique source identity and the same component name. Older copies without provenance match only component names unique in both trees. Unmatched properties are kept as optional instance `unmappedProperties` records with component name, previous path and properties; Structure exposes this JSON for manual recovery. These optional JSON metadata fields do not change the version 1 envelope and never establish live propagation. Runtime verification remains with the user.
