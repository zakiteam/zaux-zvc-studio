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
| integrations/zaux | Read-only dependency adapter and generated files |
| scripts/zaux | Generate registries and stylesheet imports outside Zaux |
| server/api/preview-css.post.js | Compile Tailwind classes authored at runtime |
| vendor/zaux | Read-only Git submodule |
| tests | Domain and browser behavior checks |
| docs/ai | Decisions, knowledge index and resumable session state |
| .agents/skills | Discoverable project skill |

## Zaux study

Studied the original checkout at `C:/xampp/htdocs/zaki/zaux`, including:
- `core/storybook/apps/builder/ZVCBuilder.vue`, its context and CRUD, layouts, storage, import/export, BYO, field and tab-session composables.
- `core/common/helpers/zvc.helper.js`, `templates.helper.js`, `components.helper.js`, translations and UI settings.
- `project/components/virtual/fancysection/FancySection.zvc.js`, metadata/defaults, and `project/templates/home/Home.tpl.js`.
- `core/setup.js`, project setup, component registries, Zsection, ComponentsRenderer, IntroText and button contracts.
- Vite/Storybook startup, Tailwind tokens/plugins, generated SCSS and component registration scripts.

The prior builder primarily composes registered definitions and edits fields; BYO accepts serialized node snapshots. A snapshot does not retain the code or data bindings which produced it. Studio stores the editable definition separately, including explicit binding markers.

## Integration

The submodule is pinned to `a495ac536ee7932b2875f341c1106375dacc590f`. The source checkout contained uncommitted work; the submodule uses the committed version.

Nuxt initializes the original Zaux core/project setup in a client plugin. A preparation script mirrors the upstream component registration convention while writing indexes, stylesheet imports, attribute metadata and resolved Tailwind data under `integrations/zaux/generated`. Aliases redirect upstream imports of generated files there.

Zaux public assets are served through Nitro. Fonts/icons keep the original URLs. The bridge uses Tailwind 3 with Zaux design tokens; Studio's CSS is scoped to its chrome.

Nuxt runs in client-rendered mode because the editor operates in the browser. Its server is used for runtime Tailwind compilation. Optional authentication and remote project persistence use Supabase directly from the client with a publishable key and database-enforced RLS permissions.

## Editing and rendering

The library contains reusable definitions. Inserting one creates an instance with its own deep copy, independent node IDs and data overrides. Visual definitions are never linked for live propagation. Source-backed definitions retain independent configuration and use the trusted JavaScript implementation identified by sourceKey; changing that source implementation affects its consumers. See code-components.md.

Studio has a single mutable workspace. Mutations go through `commit`, which validates the resulting document, records undo history and schedules persistence. UI selection and dialogs are separate transient state.

The preview is an iframe at `/preview`. It receives serialized state over same-origin messages and returns selection/drop intents. The parent checks the sender and origin. The iframe's width is the real responsive viewport. Zaux components render through the original ComponentsRenderer; editor IDs are added only to preview props.

Custom CSS is limited to the preview document. Property values are sanitized there before rendering HTML; no imported JavaScript is evaluated. Preview is a trusted local authoring tool, not a hardened multi-tenant sandbox.

## Runtime Tailwind

Static scanning cannot discover arbitrary classes typed after deployment. The small Nuxt endpoint compiles the document's authored classes with Zaux's Tailwind config, caches recent results, and passes the CSS into the iframe. The endpoint statically imports the project Tailwind configuration so Nitro can include its tokens and plugins in the server build, without loading source files relative to the process working directory at runtime. Nitro explicitly inlines imported modules under `integrations/zaux/` and `vendor/zaux/` in development and production, preventing local Tailwind dependencies from becoming external imports with incorrect Windows paths in the dev bundle. This only bundles modules reached by server imports; it does not modify the submodule. Preflight stays disabled because this endpoint emits utilities only. Static hosting still needs an external compiler. Development and production runtime behavior remain subject to manual verification.

## Local persistence

The key is `zx_builder_workspace_v1`. Writes are debounced, flushed before unload, and surfaced in a status indicator. Invalid previous data is preserved for recovery, and autosave stays paused until the user elects to replace it. Changes in another browser tab prompt a choice before overwriting. Undo/redo has a bounded session-only history.

## Current scope

- Visual placement, nesting, selection and reordering of whitelisted Zaux/HTML nodes. Duplicate/delete actions are available on outline rows.
- Per-instance content, field definitions, nested JSON properties and explicit bindings.
- Editable JSON, generated JS, CSS, browser persistence and recovery.
- Imports support Studio's versioned JSON envelopes.
- Native .zvc.js modules under app/zvc load automatically and execute their actual buildNode function when content changes. Source files are bundled by Vite, never evaluated from pasted or uploaded text. Explicit conversion freezes the current result as an editable visual tree.
- Zaux components with specialized content props can be configured in the JSON property editor. Visual child nesting uses default slots on known containers.
- Optional Supabase authentication and remote JSON project persistence support owner, editor, and viewer access. User activation and membership management are currently administered in Supabase; a sharing UI, asset uploads, and a browser JavaScript editor are not included. Hand-written code is maintained in project files.

## Shared builder dropdown

`app/components/builder/BuilderDropdown.vue` wraps the Zaux `Popover` and uses `BuilderButton` for its trigger and menu actions. Pass a translated `label` and an `items` array (`id`, `label`, optional `icon`, `disabled`, `hidden`, `active`, `danger`, `separator`, `heading`). The `select` event returns the selected item; application actions belong to the parent. An optional `header` slot adds contextual information; `align` accepts `start` or `end`. The wrapper handles arrow/Home/End navigation, Escape, Tab, outside click and focus restoration.

The workspace project menu uses this control for switching projects, creating, saving, renaming and deleting. It displays the current project and persistence status, retaining the existing role restrictions and delete confirmation.

## Builder header

`BuilderWorkspace.vue` owns the workspace provider and panel layout. `BuilderHeader.vue` consumes that provider and owns the header UI: `#zb-top-bar` places the logo on the left and project, template and account menus on the right. The second row contains the current editing context, save status and work tools (undo, redo, styles, import and export). Template selection and management moved out of the sidebar. The account dropdown displays the signed-in email and currently exposes only logout. `BuilderDropdown` supports optional `icon` and `iconOnly` trigger props while retaining its accessible label.

## Builder typography

Studio UI uses the project-owned Tailwind `font-builder` family (Inter from Google Fonts, normal and italic). The Zaux `font-main` utility and `--zx-font-*` tokens remain unchanged for authored content. The project font stylesheet is loaded by `app/pages/preview.vue` only, rather than the global application head. Builder controls, login, loading UI and preview editing overlays explicitly use `font-builder`; code editors keep their monospace family. Editing Zaux typography tokens therefore does not change the Studio UI family.

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

`integrations/zaux/property-descriptors.js` combines Vue prop descriptors with selected upstream metadata and builder definitions. Size and theme options for Zsection, IntroText and ZButton come from their metadata. Paragraph and Separator lack option arrays; the adapter supplies small lists traced to their Vue templates and styles. Zimg and HTML nodes retain inferred controls. Extend this adapter when adding component-specific controls; keep the inspector independent of component names.

`app/services/catalog.js` exposes the merged descriptors. `domain/properties.js` chooses fallback editors from the actual JSON value and descriptor, preserving value types. `BuilderProperty` renders enumerated values as selects with a custom-value editor and retains field bindings. Selecting custom mode does not mutate the property; unlisted existing values remain editable. Descriptors stay outside persisted workspace data. Runtime behavior is pending manual browser verification; no tests or builds were run.

## Visual node styling

The inspector has a dedicated Style tab containing BuilderNodeStyles, the class editor and the inline-style editor for editable visual nodes. Properties retains component props and the advanced JSON editor. The Zaux adapter in integrations/zaux/node-style-controls.js reads spacing, colors, overlays, gradients, border widths, radii and breakpoints directly from the pinned dependency. Layout controls offer block, flex and grid as illustrated choices, plus direction, alignment, wrapping, columns, column span, order and separate horizontal/vertical gaps. BuilderStyleChoices renders labelled button groups with pressed states and a reset action. SVG assets live in public/assets/builder; alignment illustrations follow the authored responsive flex direction. Older display utilities remain recognizable and replaceable even when absent from the three-choice display control. Padding and margin expose four independent sides. Spacing labels show the token key and its pixel equivalent at a standard 16px root size; saved classes still use the original spacing tokens.

The pure transformations in domain/node-styles.js read and update props.class; there is no additional persisted styling model. Edits use the inspector's existing updateNode/commit path for undo, persistence, preview compilation and exports. Literal string arrays normalize to a class string on editing. Bound classes and conditional maps remain editable through the existing property editor and disable visual controls.

The workspace checkbox "Style: follow viewport" defaults to enabled for each editor session. Shared transient state in useBuilder maps the selected preview width to its Zaux min-width prefix; Automatic selects Base (unprefixed classes), independent of the iframe width. Simplified mode starts on Automatic and offers Desktop L (xxl, 1400 px), Desktop S (xl, 1200 px), Tablet L (lg, 992 px), Tablet S (md, 768 px), Mobile L (sm, 576 px), and Mobile S (xs, 365 px preview for the 0 px minimum). Preset widths come from Zaux tokens, with the explicit 365 px Mobile S preview override. BuilderInspectorStyleTab passes this preferred scope to BuilderNodeStyles on viewport changes, node selection and tab remount. Automatic scope changes only load existing controls and never transfer or write classes. Manual scope selection remains available; disabling the checkbox keeps the current scope and restores independent selection. The selector explicitly edits base classes or one Zaux min-width prefix. Empty controls mean no recognized local utility, not a computed CSS value. Removing a local rule exposes the normal cascade. Shorthand padding, margin and gap are resolved into side/axis utilities before editing, retaining unaffected sides and other variant scopes. Recognized important utilities are displayed as custom values; replacing them writes an ordinary utility. Unknown utilities, logical sides, component rules and inline styles can still affect rendering and stay in the advanced editor. When a visual control writes a value, `tailwind-merge` identifies conflicting Tailwind utilities in the same variant scope and the editor removes them before appending the selected class. The merge check is limited to that control change, so unrelated class conflicts are not normalized as a side effect. Reset still removes the complete recognized control family.

Color controls cover text, background, gradient stops and borders. Their selectable palette excludes the zaux set, while existing zaux classes remain recognizable for replacement. BuilderDropdown and BuilderButton accept an optional swatch CSS color; dropdown items can also specify swatch. Samples use the project CSS variables (and overlay alpha) over a checkerboard, following workspace token changes without saving preview styles into nodes.

Background controls offer Zaux presets and Tailwind directional gradients with token-based from/via/to colors. Presets own their colors and use the upstream default gradient direction. Removing a gradient uses bg-none; removing its local rule instead permits inheritance. Border-none is exposed as the zero-width Zaux token (Tailwind also uses that name for border-style: none); border-hidden is the separate style control. Whole-border controls do not replace independently authored side borders or corner radii.

New palette elements do not receive default inline styles. This changes insertion presets only; saved nodes, imported definitions and the sample workspace retain their authored styles.

No tests, browser checks, validators or builds were run for this addition. Runtime behavior is pending user verification.

## Studio hub and editor routes

After sign-in, `/` lists accessible Supabase projects in a responsive grid using the `hub` layout. The layout provides a sidebar for Projects and Local workspace. Cards link to `/editor/:id`, show membership and update time, and expose rename for owners/editors and deletion for owners. Mutations use the existing revision-matched project services and a native modal dialog. A stale revision refreshes the list and requires reopening the action with current project data. Empty, loading and failure states are localized.

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

BuilderImageStyles shares the Style breakpoint selector and offers object fit, nine object-position presets and custom X/Y lengths or percentages. integrations/zaux/image-style-controls.js selects imgClasses for Zimg and class for HTML img. Null Zimg imgClasses starts from the upstream object-cover/h-full/w-full defaults; edits persist a literal array for the inner img, preserving unrelated classes and responsive scopes. Clearing removes only the selected local utility, rather than restoring the entire component default. Bound or conditional image classes disable these controls independently of the picture wrapper. Existing node mutations handle undo, persistence and export. Source reviewed only; runtime and visual checks remain with the user.

### Studio color mode

Studio defaults to dark mode and remembers the account menu toggle in browser storage under zx_builder_theme. Both hub and editor expose the action. useStudioTheme shares the preference; app.vue applies a route-aware data-studio-theme attribute to html. editor.css defines independent Studio zaux palettes for light and dark mode and aliases set1 to them, with a separate middle-grey value. These overrides include teleported UI through inheritance. app.vue also toggles the existing Zaux zaux-theme-scheme--dark class for Tailwind dark: utilities, preserving the upstream configuration and preview theme behavior. The preview route omits the attribute; the preference is not part of project data or exports. Storage failures retain the session choice. Source reviewed only; visual and runtime verification remain with the user.

### Global and individual edges

Border, radius, padding and margin sections have independent UI-only global/individual toggles. Padding and margin reuse the existing shorthand splitting and preserve other sides when edited individually. Global controls show Mixed values when recognized sides differ. Switching modes never writes classes; changing or clearing a global field replaces its physical sides at the selected breakpoint. Individual radius controls split physical shorthand classes while preserving other corners. Border width, color and style are independently editable for each side; side styles use Tailwind arbitrary CSS properties. Logical edges remain in the advanced class editor. No tests, browser checks or builds were run; runtime verification remains with the user.

### Viewport-specific style visibility

`integrations/zaux/style-visibility.js` owns the inspector visibility policy. The `*` entry is the default; exact scope keys such as `''` or `md:` override it. `sections: null` includes all sections; a section map accepts `true` for an entire section or an array of control IDs. Global controls are shown only when their complete side set is allowed. `image` and `advanced` control the image panel and raw class/inline-style editors; `hint` selects localized guidance.

Base and explicit breakpoints currently use the default policy and expose the full editor. Scope-specific restrictions can be restored through the visibility configuration. The inspector quickpad uses the same policy and follows the selected style scope. Filtering leaves authored data and the initial viewport-transfer behavior intact. Runtime verification remains manual.
