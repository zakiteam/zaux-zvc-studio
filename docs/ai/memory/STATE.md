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
