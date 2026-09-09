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

Static scanning cannot discover arbitrary classes typed after deployment. The small Nuxt endpoint compiles the document's authored classes with Zaux's Tailwind config, caches recent results, and passes the CSS into the iframe. The endpoint statically imports the project Tailwind configuration so Nitro can include its tokens and plugins in the server build, without loading source files relative to the process working directory at runtime. Preflight stays disabled because this endpoint emits utilities only. Static hosting still needs an external compiler. Production runtime behavior remains subject to manual verification.

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
