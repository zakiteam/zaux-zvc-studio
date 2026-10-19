# Dev mode and PHP export

## Dev mode

Fourth editor mode next to Design mode, Design tokens and Theme editor (`BuilderModeSwitcher`, `workspaceView === 'dev'`). It is the design view itself (`BuilderDesignView`: canvas, workspace tabs, templates, outline, viewport and zoom) with the design options removed and the Inspector replaced by `BuilderDevPanel.vue`.

- Read-only through the existing edit gate: `canEditRemote` is false in Dev mode, so `commit`, undo/redo and every control gated by it refuse changes (`zx_builder_dev_readonly`). Remote saves and project actions follow the role only (`remoteWritable`), so pending saves still flush.
- Navigation and selection stay: templates (sidebar pages and header breadcrumb), workspace tabs, outline and canvas selection, zoom, viewport, CSS inspector, preview toggle. Dev mode allows only view/navigation/export layout shortcuts (`DEV_LAYOUT_ACTIONS` in `useBuilder.js`).
- Hidden or disabled: Library and Elements tabs, outline copy/paste/sync/reset/group tools, row duplicate/delete, instance rename, free drop zone, body background, command palette, Quick style. The node context menu keeps selection, folding and export items (`DEV_MENU_ITEMS`). The canvas receives `readonly`: selection, hover outline and toolbar name stay, drag, drop and node actions do not.
- `BuilderDevPanel`: scope tabs **Element / Component / Page** (follows the selection), details (tag, classes, children, fields read, export name, source, ZVP used, own CSS, page component list that selects on click), data contract and export with copy/download:
  - Element: Zaux JSON (rendered, `nodeRuntime`), compact JSON (`nodeDocument`), Vue markup (`vueNodeMarkup`), PHP array (`phpNodeSnippet`).
  - Component: Zaux JSON, editable JSON, JS package, Vue SFC, PHP (with usage snippet).
  - Page: Zaux JSON, editable JSON, JS package, PHP.
- A placed component exports with its page values as defaults (`definitionWithData` in `domain/export.js`, shared with the export dialog); the JS package uses the shared `componentPackageFiles` (`app/services/starter-export.js`).

## PHP export (`domain/php/`)

PHP is an export format, the counterpart of the JavaScript ZVC/ZVP export (`componentFiles` / `filesForDefinition`): the same selection can be seen or downloaded as PHP. Each ZVC/ZVP becomes a function that merges `$data` over the defaults and returns the Zaux runtime node, the same "piece of JSON" `buildNode` returns (`{ ...meta, ...node }`). There is no precise spec yet, so the composition is meant to be retouched.

Where it appears:
- Export dialog: format **PHP** for the current component and the current template (file explorer + ZIP).
- Export dialog: scope **Zaux PHP package**, the counterpart of the Zaux starter package. `BuilderStarterOptions` with `variant="php"` selects ZVC, ZVP and templates (same `excludedDefinitions` / `excludedTemplates` selection) and shows a **PHP files** card instead of styles and Studio. Layout: `components/<name>/`, `components/_partials/<name>/`, `templates/<name>.php` (`phpProjectExport`); `<name>` is the same as in the Zaux starter package (export name without ZVC/ZVP, lowercase, numeric suffix when taken: `splitsection`, `splitsection2`), and renamed duplicates keep that name in their files (`SplitSection2.zvc.php`). The template export uses the same layout restricted to that template, like the JS template export.
- `zvc-helper.php` and `README.md` are **opt-in** in every PHP export (unchecked by default: checkboxes in the dialog and Dev panel, `options.helpers` / `options.readme`). Without the helper file the generated files do not `require` it and their header says the helpers must be loaded once by the project.
- Node context menu: **Export ZVC (PHP)** (`export-php`), next to Zaux JSON and JavaScript.
- Inspector **Code** tab: **PHP** view of the entry file, with download.
- Dev mode panel: component and page packages, plus a PHP array snippet for a single element.

Default output for one component (profile v1), mirroring the JS files:

| JavaScript | PHP |
| --- | --- |
| `Hero.zvc.js` / `Card.zvp.js` | `Hero.zvc.php` / `Card.zvp.php`: `function zaux_zvc_hero(array $data = [], array $params = [])` |
| `Hero.meta.js` | `Hero.meta.php` (`return [...]`) |
| `data/Hero.defaults.js` | `data/Hero.defaults.php` (`return [...]`) |
| `ZVCHelper.getValue` / `renderNode` | `zaux_gv` / `zaux_render_node` in `zvc-helper.php` (+ `zaux_spread`, `zaux_resolve_partials`) |
| `_partials/<ExportName>/` + `resolve-partials.js` | `_partials/<ExportName>/` resolved by `zaux_resolve_partials` |
| `style/Hero.css` | `style/Hero.css` |

A template export uses the package layout restricted to that template: `templates/<name>.php` holds a function returning the list of nodes, each component called with the data configured in the Studio (free elements inline).

### Where to retouch the output

| File | Role |
| --- | --- |
| `profile.js` | **The place to change the PHP.** Naming, file layout, namespace, function guards, return type (`returns: 'array' \| 'json'`), empty-object literal, meta content, root shape and the text templates of the entry, meta, defaults and page files. Templates receive prepared pieces `p` (names, paths, requires, `p.php(value)` literal printer, `p.indent`, `p.guard`). Bump `version` when the contract changes. |
| `helpers.js` | Text of `zvc-helper.php` (override with `templates.helpers`). |
| `emit.js` | Prepares the pieces and writes the files of a unit; no layout decisions. |
| `model.js` | Workspace definition → JSON model (`exportName`, `kind`, `fields`, `defaults`, compact `nodes` with `$bind`/`$spread`, `partials`, `css`, `snapshot`). |
| `printer.js` | JSON → PHP literal: literals stay literal (false, 0, '', null); `$bind` → `zaux_gv($data, 'key')`, `$spread` → `zaux_spread($data, 'key', [...])`; strings always quoted, control characters escaped. |
| `index.js` | Assembly and API: `phpComponentExport`, `phpTemplateExport`, `phpProjectExport`, `phpNodeSnippet`; options `profile`, `helpers`, `readme` (both false by default). |

Semantics mirror the JS runtime: `array_replace(defaults, $data)`, exact key then dot path (`getValue`), `$spread` merges only associative arrays, ZVP references wrapped in `ComponentsRenderer`, empty JSON objects as `(object) []` so `json_encode` keeps `{}`. Equal copies share one function; different copies with the same export name get a numeric suffix. Field mapping mirrors the JS `gv` calls: visual ZVC/ZVPs carry explicit `$bind`/`$spread` markers, printed as `zaux_gv($data, 'key')` / `zaux_spread(...)`. Native (JavaScript) ZVC/ZVPs have no markers because their tree comes from `buildNode(data)`: `bindings.js` renders the module once with sentinel field values (non-empty strings and non-empty objects), turns intact sentinels into `$bind` and spread object fields into `$spread`, and keeps the result only if, resolved with the real data, it equals the real render exactly. Fields used in conditions, concatenations or transformations stay literal; the JS logic itself is not translated (noted in the file header). Without the module the stored projection (ZVC) or a runtime snapshot (ZVP) is used.

Not in v1: CMS/ACF bindings (an earlier draft generated ACF field groups; removed until there is a spec), server-side HTML rendering. Integer-like keys become PHP integer keys.
