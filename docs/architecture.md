# Architecture

## File ownership

| Path | Responsibility |
| --- | --- |
| app/components/builder | Editor panels, dialogs and controls |
| app/composables/useBuilder.js | Editor selection, mutations, undo/redo, save lifecycle |
| app/composables/useTranslation.js | Minimal reactive Italian/English localization |
| app/services | Browser storage, downloads, catalog and preview sanitization |
| app/zvc | Hand-written native ZVC modules, metadata and defaults |
| app/data/catalog/palette.js | Explicit drag-and-drop whitelist and insertion presets |
| app/data/icons.js | Editor action names mapped to actual Zaux symbols |
| app/data/locale | UI dictionaries |
| app/pages/preview.vue | Actual Zaux rendering in a separate browser viewport |
| app/assets/styles | Studio chrome and Zaux stylesheet entry |
| domain | Pure JSON model, tree operations, validation and export generation |
| domain/zaux-bridge.js | Bridge version check, starter-file filtering, preview-head font merge |
| app/services/zaux-bridge.js | File System Access API IO: picker, listing, detection and writes |
| app/components/builder/BuilderProjectBridge.vue | Filesystem picker modal and project-link export |
| integrations/zaux/version.js | Builder's pinned Zaux core version |
| integrations/zaux | Read-only dependency adapter and generated files |
| scripts/zaux | Install the pinned Zaux release; generate registries and stylesheet imports outside Zaux |
| server/api/preview-css.post.js | Compile Tailwind classes authored at runtime |
| vendor/zaux | Read-only installed Zaux release (gitignored) |
| tests | Domain and browser behavior checks |
| docs/ai | Decisions, knowledge index and resumable session state |
| .agents/skills | Discoverable project skill |

## Studio variants

`domain/variants.js` owns named alternatives, content swapping and the active-only
projection. `domain/validation.js` validates inactive content on import/save and
`domain/workspace.js` copies all variants independently. `domain/partials.js`
isolates variant selection for nested ZVP occurrences. `BuilderVariants.vue`
provides Inspector controls through `useBuilder.js` commits; `BuilderPartialFields`
provides the occurrence selector, including sliders. Preview and thumbnail paths
omit inactive alternatives; starter and component exports operate on active
definitions only. See [the data contract](data-format.md#studio-variants).

## Zaux study

Studied the original checkout at `vendor/zaux`, including:
- `vendor/zaux/core/storybook/apps/builder/ZVCBuilder.vue`, its context and CRUD, layouts, storage, import/export, BYO, field and tab-session composables.
- `vendor/zaux/core/common/helpers/zvc.helper.js`, `templates.helper.js`, `components.helper.js`, translations and UI settings.
- `project/components/virtual/fancysection/FancySection.zvc.js`, metadata/defaults, and `project/templates/home/Home.tpl.js`.
- `vendor/zaux/core/setup.js`, project setup, component registries, Zsection, ComponentsRenderer, IntroText and button contracts.
- Vite/Storybook startup, Tailwind tokens/plugins, generated SCSS and component registration scripts.

The prior builder primarily composes registered definitions and edits fields; BYO accepts serialized node snapshots. A snapshot does not retain the code or data bindings which produced it. Studio stores the editable definition separately, including explicit binding markers.

## Integration

The Zaux release is pinned in `package.json#zaux` (`repository`, `version` tag). `scripts/zaux/install.mjs`, run first by `prepare.mjs` (so by `dev` and `build`), installs it into `vendor/zaux` when `vendor/zaux/.zaux-release.json` does not match. Sources, in order: `ZAUX_SOURCE_DIR` (copy of a local checkout, without `.git`/`node_modules`), the cached zip in `.cache/zaux/<version>.zip`, the GitHub API zipball of the private repository authenticated with `ZAUX_GITHUB_TOKEN` (`.env` is loaded by the script). Extraction goes to `vendor/zaux.staging` and replaces `vendor/zaux` only on success; a Git checkout in `vendor/zaux` is never deleted. `ZAUX_VERSION` overrides the pinned tag for a single run; it must be listed in `package.json#zaux.supported` unless `ZAUX_ALLOW_UNSUPPORTED=1`. The hub sidebar (`app/layouts/hub.vue`) shows the active version from `integrations/zaux/version.js`. In production, either build where the token is available and deploy `.output`, or set the token in the build environment.

Nuxt initializes the original Zaux vendor/zaux/project setup in a client plugin. A preparation script mirrors the upstream component registration convention while writing indexes, stylesheet imports, attribute metadata and resolved Tailwind data under `integrations/zaux/generated`. Aliases redirect upstream imports of generated files there. Release archives contain case-only duplicates (`ZSection.vue`/`Zsection.vue`, `ZVideo.vue`/`Zvideo.vue`); the installer writes each identical pair once, records it in `vendor/zaux/.zaux-release.json#caseVariants`, and the preparation script registers both names (component indexes and theme catalog), as a case-sensitive checkout would.

Zaux public assets are served through Nitro. Fonts/icons keep the original URLs. The bridge uses Tailwind 3 with Zaux design tokens; Studio's CSS is scoped to its chrome.

Nuxt runs in client-rendered mode because the editor operates in the browser. Its server is used for runtime Tailwind compilation. Optional authentication and remote project persistence use Supabase directly from the client with a publishable key and database-enforced RLS permissions.

## Editing and rendering

The library contains reusable definitions. Inserting one creates an instance with its own deep copy, independent node IDs and data overrides. Visual definitions are never linked for live propagation. Source-backed definitions retain independent configuration and use the trusted JavaScript implementation identified by sourceKey; changing that source implementation affects its consumers. See code-components.md.

Studio has a single mutable workspace. Mutations go through `commit`, which validates the resulting document, records undo history and schedules persistence. UI selection and dialogs are separate transient state.

`BuilderWorkspaceTabs.vue` owns session-only editing shortcuts and is mounted in
the top bar (`BuilderHeader.vue`), hidden but still mounted outside Design. It observes the current template or
library definition through `useBuilder()` and navigates through `selectTemplate`
and `selectLibrary`. Shortcuts are unique by entity kind and ID, retain opening
order, resolve names from the current document, and disappear when their entity
is deleted. Tabs can be reordered by dragging their labels, with an insertion
marker and horizontal scrolling near the strip edges, or with Alt + Left/Right
on a focused label. Reordering only changes local shortcut order and preserves
the edited entity. A tab closes with its × button or a middle click. Closing the active shortcut selects its next neighbour (or previous
when last); the only remaining shortcut stays open. The active shortcut scrolls
into view within the horizontal strip. History resets on workspace changes or
component unmount, remains available while Design is hidden, and is never saved
or exported. The component can be moved anywhere inside the Builder provider
without changing its parent or the workspace data model.

The preview is an iframe at `/preview`. It receives serialized state over same-origin messages and returns selection/drop intents. The parent checks the sender and origin. The iframe's width is the real responsive viewport. Zaux components render through the original ComponentsRenderer; editor IDs are added only to preview props.

Custom CSS is limited to the preview document. Property values are sanitized there before rendering HTML; no imported JavaScript is evaluated. Preview is a trusted local authoring tool, not a hardened multi-tenant sandbox.

## Runtime Tailwind

Static scanning cannot discover arbitrary classes typed after deployment. The small Nuxt endpoint compiles the document's authored classes with Zaux's Tailwind config, caches recent results, and passes the CSS into the iframe. The endpoint statically imports the project Tailwind configuration so Nitro can include its tokens and plugins in the server build, without loading source files relative to the process working directory at runtime. Nitro explicitly inlines imported modules under `integrations/zaux/` and `vendor/zaux/` in development and production, preventing local Tailwind dependencies from becoming external imports with incorrect Windows paths in the dev bundle. This only bundles modules reached by server imports; it does not modify the submodule. The endpoint compiles only classes missing from the static stylesheets: `scripts/zaux/static-classes.mjs` (run by prepare) lists every class the static CSS contains (content scan plus expanded safelist, via Tailwind internals) in `generated/static-classes.json`, and `integrations/zaux/runtime-classes.js` drops those candidates. The runtime CSS is appended after the static CSS, so re-emitting a static class would override its responsive variants inside Zaux templates (a runtime `hidden` beating `md:block` in FeatureSection). Remaining edge: a runtime-only base class still wins over a static responsive variant of the same property on the same element. Preflight stays disabled because this endpoint emits only the components and utilities layers: components are required for Zaux containers (`container-*`, registered with `addComponents`) and plugin classes such as `prose` and `aspect-*`, which the static safelist covers only with plain breakpoint variants (not `!`, `max-*`, state or stacked variants). The Tailwind assistance preview compiles the same two layers. Utilities that Zaux declares in SCSS `@layer` blocks (scrollbar themes/sizes, `grdg-*` gradient directions, `input-fill-y`) are not visible to the endpoint; `scripts/zaux/prepare.mjs` compiles those SCSS files and writes their class names to `generated/layer-classes.json`, which `integrations/zaux/safelist.js` (the stand-in for Zaux's `_local/tailwind` safelist) adds as plain strings, so the static zaux.scss bundle always contains them and editor.css does not warn about unmatched patterns. Static hosting still needs an external compiler. Development and production runtime behavior remain subject to manual verification.

## Local persistence

The key is `zx_builder_workspace_v1`. Writes are debounced, flushed before unload, and surfaced in a status indicator. Invalid previous data is preserved for recovery, and autosave stays paused until the user elects to replace it. Changes in another browser tab prompt a choice before overwriting. Undo/redo has a bounded session-only history.

## Current scope

- Visual placement, nesting, selection and reordering of whitelisted Zaux/HTML nodes. Duplicate/delete actions are available on outline rows.
- Per-instance content, field definitions, nested JSON properties and explicit bindings.
- Editable JSON, generated JS, CSS, browser persistence and recovery.
- Imports support Studio's versioned JSON envelopes and a simple Zaux `name`/`props` format that the code converts to a compatible definition.
- Native .zvc.js modules under app/zvc and the read-only Zaux vendor/zaux/core/project virtual folders load automatically and execute their actual buildNode function when content changes. Source files are bundled by Vite, never evaluated from pasted or uploaded text. Explicit conversion freezes the current result as an editable visual tree.
- Zaux components with specialized content props can be configured in the JSON property editor. Visual child nesting uses default slots on known containers.
- Optional Supabase authentication and remote JSON project persistence support owner, editor, and viewer access. User activation and membership management are currently administered in Supabase; a sharing UI and a browser JavaScript editor are not included. Asset uploads use the project-owned filesystem media integration described in [Media library](media-library.md). Hand-written code is maintained in project files.

## Media library

`server/api/media/` validates the Supabase session and active profile and uses the caller's token for RLS. `server/utils/media.js` owns server authorization, persistent paths and upload limits. Sharp validates JPEG/PNG/WebP/SVG uploads. Originals are stored unchanged outside the deployment directory; raster thumbnails retain their format and SVG thumbnails use PNG. The public route serves the matching MIME type with a restrictive CSP for SVG document isolation. `server/routes/media/[file].get.js` serves public files; archived assets remain readable by URL.

`app/services/media.js` owns browser IO. `BuilderMediaPicker.vue` provides one native modal dialog for project/global catalogs, search, upload (file picker or clipboard paste), pagination and archiving; `BuilderImageInput.vue` retains manual URL entry. Project cover and library preview changes use explicit `useBuilder.js` mutations. Native source refresh preserves preview metadata; existing instance copies remain independent. The hub reads the project's cover from its existing JSON document. Personal global assets follow user ownership because the current ZVC library is workspace-local, not a shared organization catalog.

See [media storage setup](media-library.md) for deployment, permissions and lifecycle. Runtime and hosting integration remain unverified.

Library ZVC/ZVP cards also generate local cached thumbnails through the existing preview renderer. Manual images retain precedence; `useBuilder` exposes `ensureLibraryThumbnail` and `refreshLibraryThumbnail`. See [library thumbnails](library-thumbnails.md) for capture behavior, cache scope and limitations.

## Command palette

`app/components/builder/BuilderCmdPalette.vue` is a VS Code-like quick open for ZVC/ZVP definitions and palette elements (`catalog`), mounted by `BuilderWorkspace.vue` while `commandPaletteOpen` (transient state in `useBuilder.js`) is true; it opens with Ctrl/Cmd+P or the search button in the top bar. Results match name, export name or source key (prefix, then substring, then in-order characters; definitions before elements at equal score) and are capped at 100. Enter, click or the row Insert button inserts the result into the current context: in template mode ZVCs use `insertInstance`, ZVPs `insertPartial` and elements `addTemplateElement` (appended to the template, as the library cards do); while editing a definition elements and the ZVPs listed in `selectablePartials` are inserted with `addElement` (after the selected node), never ZVCs or into source definitions. Shift+Enter or the row Edit button opens a definition for editing (`selectLibrary`); elements can only be inserted. Viewers cannot insert. It is built on `BuilderModal`, placed near the top of the viewport. Each definition row shows an inline thumbnail from the Library cache (`previewImage`, else `libraryThumbnails`); missing ones are requested through `ensureLibraryThumbnail` once a row stays visible in the list for 400 ms (IntersectionObserver rooted on the list). A side panel (hidden below 860 px) previews the active result with the same thumbnail (rendered after the selection rests 250 ms) plus name, export name, kind, category, field count and Edit/Insert buttons; elements show their palette icon and group.

## Shared builder modal

Every Studio modal uses `app/components/builder/BuilderModal.vue` (2026-10-07): a native `<dialog>` opened with `showModal()`, so the browser provides the top layer, focus trapping and Escape. Consumers only fill slots:

- default slot: the body (scrolls inside the modal); `bodyClass` replaces its padding/layout (default `p-2`, e.g. `flex p-0` for split layouts);
- `header` slot: extra controls between the title and the close button (e.g. the media scope switch);
- `footer` slot: actions, right-aligned; an element with `mr-auto` (pagination, status text) sits on the left. Slots receive `close`.

Props: `title` (required), `subtitle`, `hint` (info tooltip), `size` (`sm` 440, `md` 680, `lg` 1040, `xl` 1240, `full` 1400 px), `height` (`auto` up to 90dvh, `fill` min(800px, 90dvh), `screen` 90dvh), `busy` (blocks close button, Escape and backdrop), `open` (default true: mounting opens it; bind it for a modal that stays mounted, as the expanded code editor does), `closeOnBackdrop`, `initialFocus` (selector, or `false`; by default the first form field of the body is focused) and `fallbackFocus` (selector focused on close when the opener no longer exists). It emits `close` when the user dismisses it; unmounting closes it silently and restores focus. Attributes and native listeners (e.g. `@paste`, drag and drop) fall through to the `<dialog>`, which stops keydown propagation so editor shortcuts do not fire behind it. A submit button in the footer is linked to a body form with the `form` attribute.

Consumers: `BuilderDialog` (import/export/create/rename/confirm, `closeOnBackdrop`), `BuilderFontLibrary`, `BuilderMediaPicker`, `BuilderProjectBridge`, `BuilderCodeEditor` (expanded editor) and `studio/ProjectActionDialog`.

## Shared builder dropdown

`app/components/builder/BuilderDropdown.vue` wraps the Zaux `Popover` and uses `BuilderButton` for its trigger and menu actions. Pass a translated `label` and an `items` array (`id`, `label`, optional `icon`, `disabled`, `hidden`, `active`, `danger`, `separator`, `heading`). The `select` event returns the selected item; application actions belong to the parent. An optional `header` slot adds contextual information; `align` accepts `start` or `end`. The wrapper handles arrow/Home/End navigation, Escape, Tab, outside click and focus restoration.

The workspace project menu uses this control for switching projects, creating, saving, renaming and deleting. It displays the current project and persistence status, retaining the existing role restrictions and delete confirmation.

An opt-in `filterItems` prop (default `false`) adds a compact text field above the list that filters the rendered items by their `label`, hides separators and group headings while a query is active, shows a translated empty-result message and resets when the menu closes. It focuses the field on open, keeps arrow navigation from the field into the filtered actions and is enabled for the color/token dropdowns and the slide content picker.

## Builder header and Figma-like layout

`BuilderWorkspace.vue` owns the workspace provider; `BuilderDesignView.vue` owns the panel layout. The UI follows a Figma-like arrangement that leaves most of the space to the canvas (user request, 2026-10-07):

- **Top bar** (`BuilderHeader.vue`, one 44 px row): logo (hub link) and main menu (hub, import, export, project bridge, media library, fonts, thumbnails), `BuilderModeSwitcher`, the project / template breadcrumb (project dropdown with status, cover and project actions; the template name toggles `BuilderTemplates`), `BuilderWorkspaceTabs` as file-like tabs, then save status, undo/redo, Export, the standalone preview action and the account menu (language, Studio theme, logout).
- **Left panel** (`BuilderSidebar.vue`): tabs Structure / Library / Elements in `leftTab` (`layers`, `library`, `elements`). Structure stacks `BuilderPages.vue` (compact template list, like Figma pages) above the outline, whose sticky toolbar holds copy, paste, sync instances, collapse all and a help toggle. Hovering a tab while dragging a builder item opens it after a short delay, so library items and palette elements can still be dropped into the outline. Row actions in the outline appear on hover, focus or selection.
- **Canvas** (`BuilderCanvas.vue`): `BuilderPreviewControls.vue` is passed into its `toolbar` slot and holds the library-editing badge, viewport selects, zoom, body background, follow-viewport styles, canvas color and Preview mode. The iframe keeps its nominal viewport width; `canvasZoom` (`'fit'` or a scale) only scales it with a CSS transform, and `canvasScale` reports the applied scale. Fit uses at most 100 %. A frame label shows the viewport and zoom.
- **Right panel**: `BuilderInspector.vue` with a compact heading, `BuilderVariants` on one row (hint in an info tooltip) and dense tabs; `BuilderStyles.vue` replaces it in Design Tokens mode.

Panel widths (left 220–480 px, default 264; right 260–720 px, default 304) and collapsed state are per-browser preferences in `app/services/layout-preferences.js` (`zx_builder_layout`), never project data. `sidebarCollapsed`, `inspectorCollapsed`, `canvasZoom` and `canvasScale` are transient UI state in `useBuilder.js`. Shortcuts (`layoutShortcut` in `app/services/node-shortcuts.js`, also forwarded from the preview iframe except on the standalone page): Ctrl/Cmd+\ toggles both panels, Shift+1 fits, Shift+0 is 100 %, Ctrl/Cmd +/− zooms. Ctrl/Cmd+P opens `BuilderCmdPalette`, Ctrl/Cmd+K and Ctrl/Cmd+L open the Elements or Library tab (showing the left panel) and focus its search, Ctrl/Cmd+E opens the export dialog on the selected ZVC (`openExport({ scope: 'component' })`; these four also work from form fields, not from code or rich-text editors), Alt+1/2/3 open the Structure, Library and Elements tabs (Figma-style, by physical key; Alt+1 also reveals the current selection in the outline), and Delete removes the selected node (`nodeDeleteShortcut`, same permissions as the canvas delete action, also forwarded from the preview iframe). `BuilderDropdown` supports optional `icon` and `iconOnly` trigger props; icon-only triggers pass `iconName`/`hasIcon` through `extraTriggerProps`.

## Builder typography

Studio UI uses the project-owned Tailwind `font-builder` family (Inter from Google Fonts, normal and italic). The Zaux `font-main` utility and `--zx-font-*` tokens remain unchanged for authored content. The project font stylesheet is loaded by `app/pages/preview.vue` only, rather than the global application head. Builder controls, login, loading UI and preview editing overlays explicitly use `font-builder`; code editors keep their monospace family. Editing Zaux typography tokens therefore does not change the Studio UI family.

## Font library

The dashboard exposes a shared Supabase font catalog through `BuilderFontLibrary.vue`; active users read all entries and authors manage their own. `app/services/fonts.js` owns catalog IO, safe stylesheet-link extraction and preview DOM loading. `domain/fonts.js` validates independent project snapshots and generates developer exports. `useBuilder.js` commits selection into `styles.fonts`; the preview loads unique stylesheet URLs and disposes removed links. Style settings map selected families to existing Zaux tokens. Component ZIP exports include `fonts.json` and `fonts.html`. See [font library](font-library.md) for setup and lifecycle. Runtime verification remains manual.

## Inspector tabs

`app/components/builder/BuilderInspector.vue` owns the panel heading, tab navigation, shared source notice, empty state and error display. Tab markup and behavior live together under `app/components/builder/inspector/`:

- `BuilderInspectorPropertiesTab.vue`: node actions, type selection, property descriptors and the advanced properties JSON draft.
- `BuilderInspectorStyleTab.vue`: class and inline-style editing, composing the shared `BuilderNodeStyles` control.
- `BuilderInspectorDataTab.vue`: field visibility, resolved values, defaults and instance overrides.
- `BuilderInspectorFieldsTab.vue`: field definitions, types, creation and removal (formerly `BuilderFields.vue`).
- `BuilderInspectorCodeTab.vue`: export name, definition JSON draft, generated JavaScript and CSS.

Tabs consume the existing `useBuilder()` provider; document mutations still use its actions. Properties and Code remain mounted while their inactive content is removed with `v-if`, preserving draft watchers and code mode across tab changes and empty selections. Fields remounts on tab entry or definition/source changes, retaining the previous field form lifecycle. Shared controls remain directly under `builder/`. Properties and Code emit errors to the panel, which retains the selection-driven reset.

This extraction was reviewed in source only; runtime verification remains manual.

## Property inspector descriptors

The central extension point is **integrations/zaux/descriptors/property-decorators.js**: static descriptor patches or synchronous functions of current props/tree context. Icon options come from bundled SVG symbols and size tokens. Image fields and overlay target selects use the same registry; the Inspector supplies context. See [Property decorators](property-decorators.md) for the call chain and examples.

`integrations/zaux/descriptors/property-descriptors.js` combines Vue prop descriptors with selected upstream metadata and builder definitions. Size and theme options for Zsection, IntroText and ZButton come from their metadata. Paragraph and Separator lack option arrays; the adapter supplies small lists traced to their Vue templates and styles. Zimg and HTML nodes retain inferred controls. Extend this adapter when adding component-specific controls; keep the inspector independent of component names.

`app/services/catalog.js` exposes the merged descriptors. `domain/properties.js` chooses fallback editors from the actual JSON value and descriptor, preserving value types. `BuilderProperty` renders enumerated values as selects with a custom-value editor and retains field bindings. Selecting custom mode does not mutate the property; unlisted existing values remain editable. Descriptors stay outside persisted workspace data. Runtime behavior is pending manual browser verification; no tests or builds were run.

## Visual node styling

Literal class strings in the Style tab use the isolated `BuilderStyleInput` with optional
Tailwind completions and compiled CSS details. The server-only Zaux adapter uses the
pinned compiler and project configuration; shared generic inputs remain unchanged.
See [Tailwind assistance](tailwind-assistance.md) for ownership, keyboard interaction,
limitations and session/deployment disable switches. Runtime verification remains manual.

The inspector has a dedicated Style tab containing BuilderNodeStyles, the class editor and the inline-style editor for editable visual nodes. Properties retains component props and the advanced JSON editor. The Zaux adapter in integrations/zaux/controls/node-style-controls.js reads spacing, colors, overlays, gradients, border widths, radii and breakpoints directly from the pinned dependency. Layout controls offer block, flex and grid as illustrated choices, plus direction, alignment, wrapping, columns, column span, order and separate horizontal/vertical gaps. BuilderStyleChoices renders labelled button groups with pressed states and a reset action. SVG assets live in public/assets/builder; alignment illustrations follow the authored responsive flex direction. Older display utilities remain recognizable and replaceable even when absent from the three-choice display control. Padding and margin expose four independent sides. Spacing labels show the token key and its pixel equivalent at a standard 16px root size; saved classes still use the original spacing tokens.

The pure transformations in domain/node-styles.js read and update props.class; there is no additional persisted styling model. Edits use the inspector's existing updateNode/commit path for undo, persistence, preview compilation and exports. Literal string arrays normalize to a class string on editing. Bound classes and conditional maps remain editable through the existing property editor and disable visual controls.

The workspace checkbox "Style: follow viewport" defaults to enabled. `useBuilder.js` maps the selected preview width to its native Zaux band; Automatic selects Base. Following the viewport, switching nodes and changing the Style scope never writes classes in the descending policy. Manual selection remains available, including when following is disabled.

`integrations/zaux/responsive-styles.js` owns the authoring policy and token-derived band labels. The default `responsiveStylePolicy = 'max-width'` gives the inspector a descending editing experience while preserving native min-width classes in storage, preview and every export. Set that constant to `'min-width'` to restore the original local-scope editor, labels, preview widths and initial Base-transfer behavior; no data migration is required. Existing and imported classes are not rewritten on load.

`integrations/zaux/viewports.js` owns the canvas-only adjustment: preset widths remain nominal and `previewWidth` subtracts exactly 1 px in descending mode. In `useBuilder.js`, `nominalViewportWidth` supplies labels while `viewportWidth` supplies the actual iframe width. Selecting 768 px therefore renders at 767 px; selecting 992 px renders at 991 px. Both simplified and full Zaux presets follow this rule, including the largest preset; Automatic remains fluid. The zero-width `xs` token retains its usable nominal fallback (365 px in simplified mode, 413 px in full mode). Style labels retain the nominal upper boundary (`md <= 992 px`) as an authoring convention, not a change to CSS semantics. Scope selection uses the actual preview width and native min-width thresholds: 767 px selects `sm:`, 991 px selects `md:`. No arbitrary media qualifiers, shifted CSS breakpoints or special export handling are generated.

`domain/responsive-node-styles.js` adapts the original `domain/node-styles.js` operations. For each edited property it reads the native class cascade, updates the selected band and consecutive smaller bands with the same value, then serializes only value transitions as min-width classes. A different smaller value stops propagation. Starting with `block`, setting Grid at `md` produces `grid lg:block`; setting Flex at `sm` produces `flex md:grid lg:block`. Editing `md` again preserves the smaller Flex override and the larger Block value. Only the edited property is normalized; unrelated utilities, compound variants, conditional bindings and other physical sides are preserved. Equal-valued boundaries have no separate identity. No extra persisted style metadata or preview/export compiler is introduced.

Descending controls display effective values from recognized classes, not computed component CSS. Base displays/edits the largest band and propagates downward until a different value; its stored unprefixed class may represent a smaller override after editing. Responsive editing requires a recognized value in the immediately larger band to preserve its appearance, including each physical side of a global control. That value may come from Base or an existing native breakpoint; it does not need an unprefixed class. For example, `lg:grid` allows Flex at `md`, producing `flex lg:grid`. Fields are disabled only when the larger band has no known value; the panel links to Base to supply one. The largest band has no larger range to preserve and can be edited directly. Layout descriptors provide explicit editor baselines for direction (`flex-row`), wrapping (`flex-nowrap`), alignment (`items-stretch`) and distribution (`justify-normal`) when no recognized class exists. These controls therefore remain editable per viewport without first authoring Base. Explicit classes take precedence; opening the panel never writes defaults. Editing direction at `sm`, for example, can turn `flex` into `flex flex-col md:flex-row`. These are editor defaults, not computed component CSS; custom component or inline styles should be represented by an explicit baseline when needed. The defaults apply only to descending authoring and preserve the native-mode editor behavior. Base exposes all layout controls so flex/grid baselines can be set even when the largest viewport uses another display mode. Zimg's existing literal default image classes count as its baseline. Container centering requires horizontal margin baselines too. Reset restores the larger band's value; Base cannot be removed while different responsive values remain. The highest band's field reset has no larger value to restore and is a no-op; remove its baseline from Base after clearing overrides. Native min-width cannot cancel an earlier important rule with an ordinary rule: unrepresentable priority changes are rejected with a localized explanation and no partial mutation. Advanced classes and inline styles retain native semantics.

`BuilderNodeStyles.vue` and `BuilderImageStyles.vue` share this adapter for value edits, priority and reset. Viewport badges represent transitions in the descending experience, rather than the native guard prefixes. All writes retain the existing `updateNode`/`commit` path, undo, persistence and export. The original class editor continues to handle shorthand expansion, conflict replacement and literal string arrays. Runtime verification remains with the user; no tests, validators, browser checks or production builds were run.

Color controls cover text, background, gradient stops and borders. Their selectable palette excludes the zaux set, while existing zaux classes remain recognizable for replacement. BuilderDropdown and BuilderButton accept an optional swatch CSS color; dropdown items can also specify swatch. Samples use the project CSS variables (and overlay alpha) over a checkerboard, following workspace token changes without saving preview styles into nodes.

Background controls offer Zaux presets and Tailwind directional gradients with token-based from/via/to colors. Presets own their colors and use the upstream default gradient direction. Removing a gradient uses bg-none; removing its local rule instead permits inheritance. Border-none is exposed as the zero-width Zaux token (Tailwind also uses that name for border-style: none); border-hidden is the separate style control. Whole-border controls do not replace independently authored side borders or corner radii.

New palette elements do not receive default inline styles. This changes insertion presets only; saved nodes, imported definitions and the sample workspace retain their authored styles.

No tests, browser checks, validators or builds were run for this addition. Runtime behavior is pending user verification.

## Studio hub and editor routes

After sign-in, `/` lists accessible Supabase projects using the `hub` layout, arranged like Figma's file browser (2026-10-07). The layout sidebar holds Projects, Local workspace and the font library, plus the account footer (email, Zaux version, menu with language, Studio theme and logout). The page has a sticky toolbar with title and count, search, refresh, a filter (all / owned / shared), sort (last modified / name) and a grid or list view; filter, sort and view are per-browser preferences (`readHubPreferences` in `app/services/layout-preferences.js`, key `zx_builder_hub`). The unfiltered grid starts with a Local workspace tile. Cards and rows link to `/editor/:id`, show cover, membership and relative update time (exact date in the title), and expose an actions menu: open, duplicate and rename for owners/editors, deletion for owners. Mutations use the existing revision-matched project services and a native modal dialog. A stale revision refreshes the list and requires reopening the action with current project data. Empty, loading and failure states are localized.

`StudioAccess` shares the existing login gate across hub and editor pages; `/preview` retains its iframe entry point. `/editor/local` opens browser-local work. Project routes load the requested document and its role before mounting editor panels. Route changes remount the workspace, reset undo history and await pending saves before leaving. Failed saves or conflicts keep the editor open. The editor logo and project menu return to the hub. Creating or deleting through the editor keeps its URL aligned with the active project.

Local work keeps `zx_builder_workspace_v1`. Remote editor routes use `zx_builder_workspace_v1:project:<id>` for browser caches and storage events, preventing one project from replacing another project's local data. Opening a remote route loads the authoritative server document; its cache is not an offline revision-recovery mechanism. Deleting the active project from the editor copies its open document to local storage before navigating to the local editor.

Source and diffs were reviewed only. Browser navigation, dialogs and Supabase behavior remain pending manual verification; no tests, validators or builds were run.

### Node positioning controls

The Style tab includes static, relative, fixed and absolute positioning, independent top/right/bottom/left offsets, Translate X/Y/Z, and z-index. Z-index offers auto, preset integers and custom signed integers without units, stored as Tailwind z utilities at the selected breakpoint. Length controls offer Zaux spacing tokens, negative values, percentages for offsets and X/Y, and custom CSS lengths (unitless numbers become pixels). Clearing a control removes its local rule. Insets are split into sides before editing so the other offsets survive. X/Y use Tailwind transform utilities; Z uses the standard arbitrary property `[translate:0_0_<length>]`, which composes with transform without a dependency plugin. Editing Z replaces an existing arbitrary `translate` property; it does not decompose imported multi-axis values. The Z axis rejects percentages. All controls retain the selected breakpoint and existing class persistence/export path. Source reviewed only; runtime verification remains with the user.

### Node dimensions

The Dimensions section provides width, height and their independent minimum/maximum limits. Presets include full, min-content, max-content and fit-content, plus auto, screen or none where supported. Numeric options use the Zaux spacing tokens and persist their w-/h-/min-/max- utilities; custom non-negative CSS lengths become arbitrary utilities, with unitless values interpreted as pixels. Width/height edits split size-* shorthand while preserving the other axis. The project Tailwind bridge supplements the upstream minHeight configuration with spacing tokens and intrinsic sizing keywords. Controls follow the selected breakpoint and existing undo/persistence/export flow. Runtime remains pending manual user verification; no tests or builds were run.

### Compact style controls

BuilderStyleChoices uses compact segmented icon groups, with labels for block/flex/grid and a local-rule reset button. Imported values outside the available choices remain visible. BuilderStyleSelect wraps the shared native select or color dropdown with a translated clear button that emits the same empty value as the unset option. All sections and custom length/integer fields remain available; class transformations and breakpoint semantics are unchanged. Source reviewed only; runtime and visual verification remain with the user.

### Image fit and position

BuilderImageStyles shares the Style breakpoint selector and offers object fit, nine object-position presets and custom X/Y lengths or percentages. integrations/zaux/controls/image-style-controls.js selects imgClasses for Zimg and class for HTML img. Null Zimg imgClasses starts from the upstream object-cover/h-full/w-full defaults; edits persist a literal array for the inner img, preserving unrelated classes and responsive scopes. Clearing removes only the selected local utility, rather than restoring the entire component default. Bound or conditional image classes disable these controls independently of the picture wrapper. Existing node mutations handle undo, persistence and export. Source reviewed only; runtime and visual checks remain with the user.

### Studio color mode

Studio defaults to dark mode and remembers the account menu toggle in browser storage under zx_builder_theme. Both hub and editor expose the action. useStudioTheme shares the preference; app.vue applies a route-aware data-studio-theme attribute to html. editor.css defines independent Studio zaux palettes for light and dark mode and aliases set1 to them, with a separate middle-grey value. These overrides include teleported UI through inheritance. app.vue also toggles the existing Zaux zaux-theme-scheme--dark class for Tailwind dark: utilities, preserving the upstream configuration and preview theme behavior. The preview route omits the attribute; the preference is not part of project data or exports. Storage failures retain the session choice. Source reviewed only; visual and runtime verification remain with the user.

### Global and individual edges

Border, radius, padding and margin sections have independent UI-only global/individual toggles. Padding and margin reuse the existing shorthand splitting and preserve other sides when edited individually. Global controls show Mixed values when recognized sides differ. Switching modes never writes classes; changing or clearing a global field replaces its physical sides at the selected breakpoint. Individual radius controls split physical shorthand classes while preserving other corners. Border width, color and style are independently editable for each side; side styles use Tailwind arbitrary CSS properties. Logical edges remain in the advanced class editor. No tests, browser checks or builds were run; runtime verification remains with the user.

### Viewport-specific style visibility

`integrations/zaux/style-visibility.js` owns the inspector visibility policy. The `*` entry is the default; exact scope keys such as `''` or `md:` override it. `sections: null` includes all sections; a section map accepts `true` for an entire section or an array of control IDs. Global controls are shown only when their complete side set is allowed. `image` and `advanced` control the image panel and raw class/inline-style editors; `hint` selects localized guidance.

Base and explicit breakpoints currently use the default policy and expose the full editor. Scope-specific restrictions can be restored through the visibility configuration. The inspector quickpad uses the same policy and follows the selected style scope. Filtering leaves authored data and the initial viewport-transfer behavior intact. Runtime verification remains manual.

### Field component folders

Shared inputs and property editors live in `app/components/builder/fields/`: BuilderInput, BuilderValue, BuilderProperty, BuilderCodeEditor and BuilderRichTextEditor. Slider controls live in `fields/slides/`: BuilderSlider, BuilderSliderFields and BuilderSliderSlides. Node/image style controls live in `fields/styles/`: BuilderNodeStyles, BuilderImageStyles, BuilderStyleField, BuilderStyleSelect and BuilderStyleChoices. Panel components remain alongside BuilderWorkspace or under inspector. Consumers use explicit imports.

`domain/restore-instance.js` owns restoration and property preservation. `useBuilder.js` owns the explicit commit and selection update; BuilderSidebar presents restoration and unmatched property recovery.

### Shared slider controls

SliderSingle, SliderMultiple and HeroSliderSection use the same BuilderSlider panel and slide catalog. integrations/zaux/controls/slider-controls.js declares each palette preset, component fields and optional contentPath: HeroSliderSection stores slides and Swiper parameters inside sliderContent; the other sliders store them directly in props. Edits preserve that native shape and use the existing node mutation, persistence and export flow. Bound or custom containers remain available through advanced properties.

The shared slide catalog includes HeroSection with media-library image selection, text, CTA JSON, alignment and container controls. The exact native fullViewPort boolean is exposed separately for the hero wrapper and its SliderSingle slides; new presets disable viewport sizing. Hero slides start with a minimum height editable through their CSS classes. Full slide props and nested slider content remain editable as JSON. Runtime verification remains with the user; no tests or builds were run.

### Component theme editing and workspace views

`BuilderWorkspace.vue` owns the shared project lifecycle/header/dialogs and switches between `BuilderDesignView.vue` and `BuilderThemeEditor.vue`. Theme editing loads on first use and remains mounted to retain unapplied source drafts while switching views. `domain/component-themes.js` keeps per-component CSS source authoritative for both variable controls and direct editing. `useBuilder.js` commits edits to the optional project-level `componentThemes` array. Only preview iframes receive this CSS. `scripts/zaux/theme-catalog.mjs` derives variables and real selectors from read-only upstream Sass during project preparation. See [Theme editor](theme-editor.md) for source syntax, preview behavior, persistence and export contracts. No automated or browser verification was run.

### Virtual partials

`domain/partials.js` captures independent partial dependencies. `domain/source-runtime.js` holds trusted bundled functions only in memory; `domain/nodes.js` uses them to render native partials with each descriptor's data. `integrations/zaux/renderers/partial-renderer.js` resolves nested dynamic references and is included in JavaScript exports. The project plugin registers the existing slot adapter globally so partial trees inside sliders retain named-slot behavior. Canvas CSS compilation includes resolved trees as well as saved source snapshots.

`BuilderPartialFields.vue` shares native field types, image selection, conditional visibility and parent-field bindings between node properties and slider content. `useBuilder.js` owns creation, unique partial names and insertion; source discovery also loads `.zvp.js`. `domain/source-files.js` bundles relative imports from the local raw source catalog. `domain/starter-export.js` places ZVP entries under `_partials` while preserving independent dependencies in exported owners. See [virtual partials](virtual-partials.md). Runtime verification remains with the user.

### Preview backgrounds and standalone page

`BuilderPreviewControls.vue` groups project body color and session-only canvas controls in the canvas toolbar through `useBuilder.js`, including the header toggle beside Design/Preview; `BuilderHeader.vue` hosts the primary standalone preview action beside Export. `domain/styles.js` exports the body rule; the style bridge applies it only inside preview documents. `/view/[id]` reuses `/preview` without Studio controls, checks remote project access and follows local saved drafts through `app/services/preview-page.js`. Both routes omit Studio theme overrides. See [preview usage and file inventory](preview.md). Runtime verification remains manual.

### Project bridge (filesystem export)

`BuilderProjectBridge.vue` is a dedicated `<dialog>` modal that lists the contents of a user-granted directory through the File System Access API and links a local Zaux repository as the export destination. It reuses the starter export (`projectStarterFiles`) but, instead of downloading a ZIP, writes component/template/style files straight into the destination's dedicated paths (`project/components/virtual/…`, `project/templates/…`, `style/…`). `domain/zaux-bridge.js` owns the pure logic: version comparison (`compareZauxVersions`), filtering the ZIP-only artifacts out of the direct write (`bridgeFiles`, which drops `README.md`, `studio/*`, `fonts.html`, `fonts.json`) and the idempotent font merge into `.storybook/preview-head.html` (`mergePreviewHead`). `app/services/zaux-bridge.js` performs the browser IO (picker, listing, detection, writes); `integrations/zaux/version.js` exposes the builder's pinned Zaux core version (`vendor/zaux/package.json#coreVersion`). A mismatch between the destination `package.json#coreVersion` and the builder's version requires explicit acceptance before writing. Chromium (Chrome/Edge) on a secure context (localhost) is required; there is no server endpoint and no arbitrary path access. `BuilderProjectBridge.vue` exposes a "Parts to sync" selection (project components, imported ZVCs, templates, styles, fonts) forwarded through `projectStarterFiles` into `starterFiles`; imported (code) ZVCs are excluded by default, so only editor-authored project components are written unless the user opts in.

## Free template nodes and grouping

`domain/template-elements.js` creates free instance envelopes and groups ordered
free blocks into independent library/template ZVC copies. `useBuilder.js` owns
insertion, root drag/drop, clipboard and grouping commits. `BuilderSidebar` shows
free trees without a ZVC heading and offers palette insertion destinations;
`BuilderTree` and `BuilderDialog` expose the grouping action and name/range form.
`domain/export.js` and `domain/starter-export.js` emit direct runtime nodes and
inline template blocks respectively. See [the data contract](data-format.md#free-template-components).

## Outline range selection and drag scrolling

`domain/outline.js` projects the visible outline order, removes descendant entries
covered by selected parents, and moves a selection while retaining its order.
`useBuilder.js` owns transient range selection and the anchor for Shift-click.
Ordinary clicks and canvas selection return to a single layer; switching scope
clears the range and collapsed/deleted rows are removed from it. The Inspector
continues to edit the last clicked layer. Selection is never serialized.

Dragging a selected row carries the range in one undoable commit. Whole ZVCs
remain template blocks; editable nodes can move into compatible containers or
out to the template. Cross-definition moves use the existing node snapshot and
materialization contracts for values, CSS and independent ZVP dependencies.
Selecting consecutive free roots also prefills the Group into ZVC dialog range.
Row-local duplicate/delete and clipboard actions continue to address one node.

`useBuilderOutlineDrag.js` scrolls the outline using animation frames while the
pointer is near its top or bottom edge during a Builder drag, accounting for the
sticky toolbar. Speed increases toward the edge and the drop marker follows the
row beneath the pointer as the list moves. Leaving the list, drop, drag end,
window blur and unmount stop scrolling. Source review only; browser verification
remains with the user.

### Explicit library instance synchronization

`domain/sync-instances.js` applies the existing restoration semantics across the
current workspace. The outline sidebar offers Sync instances below Copy/Paste when editing library
ZVCs and ZVPs. ZVC copies are matched by sourceId across all templates; ZVP dependencies
are matched by libraryId or captured id, including nested dependencies, slider
descriptors and inactive variant content in library owners and templates.
The source stays unchanged. The action is one undoable commit; ordinary library
edits still do not propagate automatically. Runtime verification remains manual.
### Outline display visibility

`app/services/outline-visibility.js` reads computed display in the preview iframe,
including ancestors, and publishes hidden node keys per instance. Measurements
are batched per animation frame after rendering, DOM/style changes and viewport
resizes, including automatic width. Unchanged reports are suppressed and Canvas
rejects reports from stale state requests. `useBuilder.js` holds the result only
in transient UI state. `BuilderTree.vue` displays the Zaux visibility-off icon
beside hidden levels with a localized accessible label. Nodes absent from the DOM
are not assumed to have display:none. This does not change authored visibility.
Runtime verification remains manual.

## Export dialog entry point and canvas context menu
`useBuilder.openExport({ scope, format })` is the single way to open the export dialog: it sets `modal` to `{ type: 'export', scope, format }`, which `BuilderDialog.vue` already reads as the initial select values (`component` scope falls back to the dialog default when there is no active definition). The header Export button, the Code tab buttons, Ctrl/Cmd+E (`export-component` in `layoutShortcut`, forwarded from the iframe) and the canvas menu use it.
Right-clicking the canvas in edit mode selects the target like a click (`app/pages/preview.vue`) and posts `context-menu` with iframe coordinates; `BuilderCanvas.vue` scales them by the frame rectangle and opens a `BuilderDropdown` context menu through its exposed `openAt(x, y)` (a click in the iframe closes it via the `select` message). Items: Edit in library (template mode, needs the instance's original), Export Zaux JSON (`runtime`) and Export ZVC JavaScript (`js`), both on the `component` scope.
