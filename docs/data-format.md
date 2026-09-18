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

A field has `key`, `label`, `type` and `default`. Visual and native field types: text, textarea, number, switch, select, json, html, css-editor, button, buttongroup and component, with the original showIf conditions. Select fields add `options: [{ label, value }]`.

An instance contains `id`, `sourceId` (provenance only), `name`, a full independent `definition`, and a `data` object overriding that definition's defaults.

Native definitions additionally store sourceKey and defaults. Local source keys stay relative to `app/zvc`; upstream keys use `zaux/core/components/virtual/...` or `zaux/project/components/virtual/...`. Library categories are inferred from source-base identity and are not persisted. Their tree is a cached result of buildNode, refreshed from the installed module and current instance data. Source functions are never stored in JSON. Missing modules retain their saved tree and require restoring the module or converting to visual before editing content.

## Image references

Optional `workspace.coverImage` and `definition.previewImage` strings store absolute public image URLs. Empty strings clear previews. Existing version-1 documents remain valid without these optional fields. Preview metadata survives editable JSON export/import and independent definition copies; source-library refresh preserves its own preview. Component image properties keep ordinary strings, with no binary data or media service objects in workspace JSON. Runtime/JS exports keep image URLs and do not bundle files.

## Project fonts

The optional `workspace.styles.fonts` array stores independent `{ id, family, href }` snapshots from the shared catalog. URLs are HTTPS stylesheet URLs; no raw link markup or executable code is persisted. Existing version-1 documents without the field remain valid. The array follows workspace/style-preset import and export; component ZIPs additionally include font manifest and HTML links. Component/template-only editable JSON retains its existing contract; download font metadata separately for those scopes. See [font library](font-library.md).

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

In the Library, **ZVC from JSON** opens a JSON editor with an example and a **JSON format** select that offers two import formats.

**Workspace JSON** (the default option) is the full editable contract: a complete Studio definition (`id`, `name`, `exportName`, `fields`, `tree`, `css`) or a version 1 component envelope. The definition is validated before insertion; imports create independent IDs and copies through the standard library import path. Workspace and template envelopes are not accepted by this component-only action.

**Simple Zaux JSON** accepts one compact Zaux node or an array of nodes, written the way Zaux nodes are authored:

```json
{
  "ZVCName": "ZVCHero",
  "name": "Zsection",
  "props": { "size": "m", "contained": true },
  "children": [{ "name": "IntroText", "props": { "title": { "$bind": "title" } } }],
  "fields": [{ "key": "title", "label": "title", "type": "text", "default": "Untitled" }],
  "label": "Hero"
}
```

`name` identifies the component to render, `props` is the required plain object, `children` reuses the same compact shape at any depth, `fields` optionally carries the full field metadata (`key`, `label`, `type`, `default`, `options`, `showIf`) and the library display name follows `label`, then a declared `ZVCName`/`ZVPName`, then the first node of the resulting tree. `createDefinition` derives the export name from that display name, so a descriptor declaring `ZVCName: "ZVCFeatureSection"` keeps exactly that export name, and a runtime snapshot that declares its name is not renamed after its first node. Without `label` and without a declared name the fallback is the first node name, which for rendered section lists is often the same component (for example `Zsection`) for every import; declare `ZVCName`/`ZVPName` or `label` to keep distinct entries. `definitionFromSimpleZaux` and `parseSimpleComponentDocument` in `domain/export.js` run the conversion in the code: they derive node IDs, `kind`, display name and the `ZVC…`/`ZVP…` export name, then validate the resulting definition, so the imported entry behaves like any authored ZVC or ZVP. Prop values are never rewritten and keep false, zero, empty strings and null; existing `$bind` markers keep their data-binding meaning. Field metadata is optional, so a component authored from `name` and `props` alone keeps literal props and an empty Data field list until fields are added.

**Convert content to editable elements** is a checkbox beside the select, shown for the simple format and selected by default. Without it the node list is copied verbatim and a wrapper stays a single outline entry with `components` in its properties. With it, the same input is transposed into the visual representation: `ComponentsRenderer` wrappers expose their `props.components` as outline nodes, node arrays are flattened and `Zsection` with `content.type: 'component'` stores that content as a default-slot child, matching the native-source projection described in [code components](code-components.md). The conversion reuses `sourceTree` from `domain/source-zvc.js`, so an imported definition matches what native ZVC copies already produce:

```json
{ "name": "ComponentsRenderer", "props": { "components": [{ "name": "IntroText", "props": { "title": "Hi" } }] } }
```

becomes one `IntroText` root node instead of a `ComponentsRenderer` node containing a `components` property. Other specialized content properties (sliders, `PJPostLayout`, modals, offcanvas) stay in their own property editors, as they do for native sources.

Choosing the other option on a full definition (or a workspace/template envelope) is rejected with a translated message, and the compact format rejects `tree` and `schemaVersion` documents for the same reason. Switching the select replaces the editor text only while the example is still untouched, so a pasted draft is not discarded.

No component implementation code is imported: `name` must identify a component available to the renderer or a supported HTML tag. Use strict JSON with quoted keys and no trailing commas. Invalid drafts remain in the dialog for correction. The workspace-level **Import** action keeps its own auto-detection and also accepts the compact format, including its optional `fields` and `label`.

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

## Component theme CSS

The optional version-1 `workspace.componentThemes` array stores `{ component: 'ZButton', css: '.c-btn--theme-primary { --zx-c-btn-bg-color: 255 0 0; }' }` records. Existing documents without this field have no theme overrides. CSS strings are parsed for syntax, component IDs are unique, and only JSON data is stored. Records contain authored changes and custom CSS, never copies of all upstream defaults. Workspace saves, undo and editable workspace envelopes retain them independently of style presets. Single-component and combined CSS downloads are available in Theme editor; component JavaScript ZIPs include the project's `component-themes.css` when nonempty. Component/template-only JSON contracts are unchanged. See [Theme editor](theme-editor.md).

## Complete project starter

Export > Zaux starter package previews each file and downloads a ZIP containing all library definitions and template instances under `project/components/virtual/<name>`, and every template with `.tpl.js` and `.stories.js` files under `project/templates/<name>`. The Code inspector shortcut opens component export directly in Zaux JSON mode; the JavaScript shortcut selects JavaScript mode.

`domain/starter-export.js` owns package generation; `app/services/starter-export.js` supplies source files and Zaux configuration. Equal definitions share an export; independent copies with different structure, defaults, fields or CSS receive unique names, including case-insensitive collision suffixes. Instance overrides stay in template block data. Native exports retain source folders behind generated entries that apply the exported defaults and metadata. Missing native sources block the package instead of silently dropping components.

Token catalog entries map editable variables back to their original JSON paths. Only changed categories produce complete `style/tokens/*.json` files: colors, typography font families, radius, shadows, blur and border widths. Unedited keys remain intact. `style/studio-tokens.css` preserves all authored variables and selectors. The ZIP includes combined Theme editor overrides, effective UI configuration when edited, font references, a Studio workspace backup and a component/template manifest. Its README lists stylesheet integration and external dependencies; Zaux itself and binary media/font assets are not bundled. Runtime verification remains with the user; no tests, browser checks or builds were run.

### Current template exports

The current-template scope offers editable JSON, Zaux JSON and JavaScript. Zaux JSON uses `templateRuntime`: a top-level array of rendered nodes, matching the page JSON copied from Zaux template stories. Each node contains `ZVCName`, `name`, `props` and optional `children`, with instance values resolved. Multiple root nodes remain in order as separate array entries. There is no template envelope, block wrapper or separate data object; editor node IDs are omitted. JavaScript previews the `.tpl.js` entry first and downloads `zaux-template.zip` with the template, its story and its independent component definitions. It reuses the starter generator scoped to that template, retaining project token/theme/font/UI configuration and excluding unrelated templates and library definitions. The included Studio workspace backup is scoped to the same template. Existing component exports remain available. Source review only; runtime verification is left to the user.

## Virtual partials

Optional `definition.kind: 'zvp'` identifies a partial and requires an export name beginning with `ZVP`. Existing definitions without kind retain ZVC behavior. `sourceKey` additionally accepts `.zvp.js`. References keep ordinary `{ name, props }` JSON, both in tree nodes and nested component/slider properties. `definition.partials` stores independent full definition snapshots keyed by exportName. No functions or registry objects are serialized. Circular partial references are rejected; nesting is bounded.

Partial dependencies survive workspace/component/template JSON, copies, undo and persistence. Existing dependency snapshots take precedence over later library changes. Bundled native implementations remain shared through sourceKey, as with ZVCs. Runtime output expands partials into ComponentsRenderer descriptors containing their complete trees in props.components, which also works with sliders that only forward name/props.

JavaScript exports use `.zvp.js`, defaults, fields metadata and buildNode/renderNode. Owners include their captured dependency folders and a pure resolver. The full starter places library partials in `project/components/virtual/_partials/`; template-only packages include the dependencies of their own instances. See [virtual partials](virtual-partials.md).

## Project body background

Optional `workspace.styles.bodyBackground` stores a Zaux color reference such as `rgb(var(--zx-color-set1-white))`, a legacy hexadecimal color or `transparent`; absent or empty means no authored body override. It participates in workspace/style-preset persistence and undo. CSS presets and starter/template `style/studio-tokens.css` include the body rule; individual JavaScript exports include `body-background.css`. Canvas light/dark mode and preview header visibility are session-only and excluded from exports. See [preview](preview.md).
