# Session state

Date: 2026-09-07.

## Active instructions
Until further notice, skip tests and the verification phase. The user performs browser checks. Do not run automated tests, browser automation, validators or production builds as verification. Source reading is permitted. This overrides older testing guidance.

When commands or tools are blocked by permissions or environment state, reply with the minimum: state the block and what is needed, nothing else. Format: `Bloccato: <motivo>` / `Serve: <azione o permesso>`. See docs/ai/decisions.md.

## Implemented before current styling request
Nuxt 4 / JavaScript editor with read-only Zaux submodule; independent template/library copies; visual editing; JSON and JS exports; persistence/recovery; native source modules in app/zvc; whitelist in app/data/catalog/palette.js; duplicate/delete outline controls and valid Zaux icon aliases.

## Current work
Integrate Zaux token style configuration and migrate Studio styling to Tailwind with the Zaux palette.

## ZVC/ZVP import format select — 2026-09-18
The `ZVC from JSON` and `ZVP from JSON` dialogs now expose a **JSON format** select with two options. `Workspace JSON` keeps the previous behavior (full definition or version 1 envelope). `Simple Zaux JSON` accepts `{ name, props }` with optional `children`, `fields` and `label`, and converts it to a compatible definition in the code: `definitionFromSimpleZaux` / `parseSimpleComponentDocument` in `domain/export.js` derive id, kind, display name, export name and node ids, then validate the result. Prop values stay literal and `$bind` markers keep their meaning; field metadata is optional, as agreed with the user on 2026-09-18.

The same dialog shows a default-on checkbox, **Converti il contenuto in elementi editabili** / **Convert content to editable elements**, for the simple format. When it is active the node list is transposed through `sourceTree` from `domain/source-zvc.js`, so `ComponentsRenderer` wrappers, node arrays and `Zsection` component content become outline nodes instead of content properties; unchecked imports stay verbatim as before.

The library display name follows `label`, then a declared `ZVCName`/`ZVPName`, then the first node of the resulting tree, so a rendered snapshot keeps its own name instead of being called after its first section.

Changed files: `domain/export.js` (compact-node helper extracted to `zauxNode`, simple-format builder and parser with the `editable` option, `definitionFromNode` now reuses the builder), `app/components/builder/BuilderDialog.vue` (format select, editable checkbox with its hint, per-format hint and example, routing in `addComponentJson`), `app/data/locale/it.json` and `en.json` (eight added keys, two revised hints), `docs/data-format.md`, `docs/virtual-partials.md`, `docs/architecture.md` and `docs/ai/decisions.md`.

Reviewed by source reading only: no tests, browser checks, validators or builds were run. Runtime behavior and the new dialog text remain for manual user verification.

## Known state
A production check before the stop instruction exposed Tailwind trying to read preflight.css from Nitro output. The runtime endpoint now disables preflight because it compiles utilities only; this source fix was applied but has not been re-verified. Do not resume testing automatically.

Zaux is read-only. See docs/code-components.md for native ZVC conventions.

## Overlay content insertion — 2026-09-21
ZModal and OffCanvas now expose a dedicated Inspector panel (`BuilderOverlayContent`) to add ZVP partials and catalog components as content children, with move/duplicate/delete and select-to-edit actions. `useBuilder.js` gains `insertOverlayContent`, `removeOverlayContent`, `duplicateOverlayContent` and `moveOverlayContent`, each an undoable commit on the selected container's children. Children keep rendering through the existing `content` slot; OffCanvas still requires `contentType: default`. Changed files: `app/components/builder/fields/overlay/BuilderOverlayContent.vue` (new), `app/components/builder/inspector/BuilderInspectorPropertiesTab.vue`, `app/composables/useBuilder.js`, `app/data/locale/it.json` and `en.json`, `docs/code-components.md`. Reviewed by source reading only; runtime verification remains manual.

## Outline auto-expand on canvas selection — 2026-09-21
Selecting an element on the canvas now reveals it in the outline even when ancestors are collapsed. `useBuilder.js` `revealOutline(instanceId, nodeId)` expands the definition/instance row plus every ancestor node of the selected node (removing their `collapsedOutline` keys) before setting `revealOutlineTarget`; `BuilderCanvas.receive` forwards `message.nodeId`; `BuilderSidebar.vue` scrolls to the node (`data-zb-outline-node`, added in `BuilderTree.vue`) instead of only the instance. `domain/nodes.js` gains `ancestorIds`. Reviewed by source reading only; runtime verification remains manual.

## Media editor (BuilderMediaInput) — 2026-09-21
Added a compact, agnostic media editor for the Media component and any `media` prop that carries a Media.vue-style `{ type, props }` object. `BuilderMediaInput.vue` edits type (img/video), image source via the media library, alt, aspect ratio, lazy loading, behavior (full width / full height / object fit / fill-space when present), video URL + format + poster + playback flags, with a JSON fallback (`BuilderValue type="json"`). `BuilderProperty.vue` renders it when a descriptor has `media: true`; `property-decorators.js` opts in Card, CardMediaBox, CardPic, ZFigure, Usermeta, DisplayBox, FeatBannerSection, SectionSplit, SectionSplitIntro and SectionSplitWide. The `Media` component itself uses a thin `BuilderMedia.vue` Inspector panel (flat `type`+`props`+behavior props) wired in `BuilderInspectorPropertiesTab.vue`. `domain/media.js` gains media-object/class helpers. Reviewed by source reading only; runtime verification remains manual.

## Project bridge (filesystem export) — 2026-09-21
Added a filesystem bridge that exports the starter package directly into a local Zaux repository instead of downloading a ZIP. `BuilderHeader.vue` gains a "Collega progetto Zaux" button opening `BuilderProjectBridge.vue`, a `<dialog>` modal with a filesystem view of a user-granted directory (File System Access API, no server endpoint). It detects a Zaux project from `package.json#coreVersion` + the `project/` folder, warns on version mismatch against the builder's pinned `vendor/zaux/package.json#coreVersion` (explicit acceptance required), and writes the starter files into the destination's dedicated paths. Fonts merge idempotently into `.storybook/preview-head.html` instead of `fonts.html`; `README.md` and `studio/*` ZIP artifacts are skipped. New files: `integrations/zaux/version.js`, `domain/zaux-bridge.js`, `app/services/zaux-bridge.js`, `app/components/builder/BuilderProjectBridge.vue`; locale keys `zx_builder_bridge_*` in it/en. Requires Chrome/Edge on a secure context (localhost). Reviewed by source reading only; runtime verification remains manual.

## Zaux 2.4.0 submodule update — 2026-09-21
Updated the read-only Zaux submodule to 2.4.0 (`coreVersion` 2.4.0). Ported the builder-relevant changes: added the `global.iconSet` UI setting as a select in `BuilderStyles.vue` (options from the existing `icon-options.js` glob, so `zaux` and `zaux-squared` are auto-discovered) and fixed the stale `ZAUX_CORE_VERSION` define in `nuxt.config.js` (now derived from `vendor/zaux/package.json#coreVersion` instead of the hardcoded 2.3.4). Added locale key `zx_builder_ui_icon_set` in it/en.

Assessed and left as-is (no builder change needed): `Card.vue` `contentSlots` hooks (native metadata flows through `sourceKey`; `scripts/zaux/prepare.mjs` regenerates indexes/hooks on the next `npm run dev`), `ZButton.vue` `label` type check (the builder passes strings), `.c-richtext-style` (CSS only) and `project/public` + `copy:project-assets` (project asset publishing, out of builder scope for now).

Breaking `Icon.vue` behavior in 2.4.0: `Icon.vue` resolves the set from `uiSettings.global.iconSet` and the global value wins over the per-instance `iconSet` prop. The new select edits that global value, so it also affects Studio chrome icons (both bundled sets share the editor symbols). Reviewed by source reading only; runtime verification remains manual.


## Project bridge part selection — 2026-09-21
Added a "Parts to sync" selection to `BuilderProjectBridge.vue`: project components, imported (code) ZVCs, templates, styles and fonts, each an independent checkbox. Imported ZVCs default to OFF so a sync writes only editor-authored project components unless opted in. `domain/starter-export.js` `starterFiles` now accepts a `parts` option (defaults to everything, keeping the ZIP export unchanged) and filters library definitions via `includeDefinition` (`sourceKey` → imported, otherwise project), gates template/style/font generation, and keeps the `studio/*` manifest consistent with the filtered set. `app/services/starter-export.js` `projectStarterFiles` forwards `parts`. Locale keys `zx_builder_bridge_parts` / `zx_builder_bridge_part_*` in it/en. A template block referencing an excluded definition keeps its name but is not written (documented edge case). Reviewed by source reading only; runtime verification remains manual.

## Project bridge fix — 2026-09-21
The "Collega progetto Zaux" export reported success but wrote nothing. Root cause: in `BuilderProjectBridge.vue` the local `async function exportToProject()` shadowed the imported `exportToProject` from `app/services/zaux-bridge.js`, so the call inside it was recursive (a no-op once `busy` flipped `canExport` off) instead of invoking the service. Renamed the local handler to `writeProject` (template `@click`, function declaration and the returned object); the inner call now resolves to the imported service and performs the actual filesystem write. Reviewed by source reading only; runtime verification remains manual.

## Starter export file explorer — 2026-09-22
Replaced the flat "Files" list in the export dialog ("Pacchetto starter Zaux") with a two-pane file explorer: on the left a searchable folder outline (`BuilderFileTree.vue`, recursive, built from the flat export paths) and on the right the selected file's code. `BuilderFileExplorer.vue` composes the search input, the tree and the editor; the pure tree/grouping/filter logic lives in `domain/file-tree.js`. `BuilderCodeEditor.vue` gains a `fill` prop (reuses the existing `zb-code-expanded` full-height styling without opening the expand dialog). `BuilderDialog.vue` swaps the old `<details>` listing for `<BuilderFileExplorer v-model:selected="selectedFile" :files="jsFiles">`. Locale keys `zx_builder_starter_search_files` / `zx_builder_starter_no_results` in it/en. No third-party tree dependency added. Reviewed by source reading only; runtime verification remains manual.

## Starter export imported ZVCs toggle — 2026-09-22
The starter ZIP export now lets the user choose whether to include imported (code) ZVCs or only project ZVCs. `BuilderDialog.vue` adds an "Includi ZVC importati da codice" checkbox (default on, starter scope only) forwarded as `parts: { imported }` to `projectStarterFiles` → `starterFiles`, which already filters library definitions via `includeDefinition`. Unchecking regenerates the package with project ZVCs only. Locale key `zx_builder_starter_include_imported` in it/en. Reviewed by source reading only; runtime verification remains manual.

## Vue SFC component export — 2026-09-22
Added a "Vue SFC" format to the component export dialog (component scope only). `domain/export.js` gains `vueComponent(definition)` plus private helpers that translate the node tree into a `.vue` single-file component following Zaux conventions: `<template>` markup from the tree (HTML elements handle `textContent`/`innerHTML`, `Accordion`/`OffCanvas`/`ZModal` use the `#content` slot), `$bind` markers become prop references, literal values stay inline, and `fields` become `props` with inferred types/defaults. The script uses classic Composition API (`export default { props, setup() }`, no `<script setup>`/TypeScript); authored CSS lands in `<style scoped>`. Bound attributes serialize object/array/v-html values with single-quoted JS expressions (`vueExpr`/`vueString`) so the output stays clean instead of emitting `&quot;` entities. `BuilderDialog.vue` adds the format option, a `vue` code-editor language, a `zx_builder_vue_hint`, and renames `downloadJson` to `downloadFile` (downloads `<Name>.vue`). Locale keys `zx_builder_download_vue`/`zx_builder_vue_hint` in it/en; docs updated in `data-format.md`.

### Code editor formatting — 2026-09-22
`domain/format-code.js` now supports the `vue` language (Prettier `vue` parser via `prettier/plugins/html` + babel/estree/postcss, with `htmlWhitespaceSensitivity: 'css'` and embedded formatting for `<script>`/`<style>`). `BuilderCodeEditor.vue` maps `vue` to the HTML highlighter and allows the "Format code" action in readonly editors (removed the `readonly` guards from the button and `format()`), since `view.dispatch` still works in read-only state. `BuilderDialog.vue` mirrors the export text into an `exportPreview` ref updated by the editor's `@change`, so the readonly preview can be reformatted and the result is what "Copia"/"Scarica" use. Verified with a temporary Node import that generated and Prettier-formatted sample SFC output (not a browser check); runtime verification remains with the user. Virtual partial references render as component tags rather than being inlined.

