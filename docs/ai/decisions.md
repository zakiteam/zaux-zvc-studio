# Decisions

## 2026-09-06 - user-approved scope

- Nuxt 4, JavaScript only, Vue Composition API without script setup.
- Visual page builder: drag and drop, plus selection directly in the preview.
- Library of ZVC definitions; templates instantiate independent copies.
- Zaux as a read-only dependency; no direct changes to Zaux. (Git submodule until 2026-10-06, then release archives.)
- Browser localStorage persistence; JSON transport prepared for server-side storage.
- Export component JSON and conventional Zaux JavaScript modules.
- Minimal translation function and semantically organized folders.
- AI knowledge, a discoverable skill, and project session memory.

## Terminology (user, 2026-10-02)

- **ZVC/ZVP editing mode**: editing a library definition (`mode === 'library'`).
- **Template edit mode**: editing a template and its instances (`mode === 'template'`).
- Library sync is variant sensitive: it only updates instances set to the edited variant.

## Implementation choices

- `vendor/zaux` contains the pinned dependency. Generated bridges live elsewhere.

## 2026-10-06 - Zaux releases instead of submodule (user)

- Git submodules are impractical in production. `package.json#zaux` pins `repository` and `version` (a release tag); `scripts/zaux/install.mjs` downloads the GitHub zipball with `ZAUX_GITHUB_TOKEN` (private repo), caches it in `.cache/zaux/` and extracts it into the gitignored `vendor/zaux`, marked by `.zaux-release.json`.
- `vendor/zaux` stays the stable path of the active release so existing imports and aliases do not change. Overrides: `ZAUX_VERSION`, `ZAUX_SOURCE_DIR` (local checkout).
- Version switching happens at build time only (user choice; no side-by-side builds or live switcher). `package.json#zaux.supported` is the curated list of releases the builder has been adapted to; other tags are refused unless `ZAUX_ALLOW_UNSUPPORTED=1` (porting). The hub shows the active Zaux version.
- Client-rendered Nuxt editor with a same-origin preview iframe.
- Explicit JSON `$bind` markers preserve editable data bindings.
- Pure domain helpers and a single editor-state composable; no generic framework or plugin engine.
- Visual source JavaScript is generated from JSON. Trusted native modules in `app/zvc` are bundled by Vite and run as ordinary imports; JSON imports never execute source strings.
- Italian and English UI dictionaries.
- Nuxt uses a project-local Node runtime for compatibility with the host's older Node installation.

## 2026-09-07 - source ZVCs and editor ergonomics

- The user requested native Zaux code definitions loaded as configurable bases, a curated drag palette, direct outline duplicate/delete actions, and icon fixes.
- `app/zvc` contains ordinary Zaux modules; `sourceKey` tracks their code while copied values remain independent.
- Source bases are edited on disk. Configurable copies retain `buildNode` logic; conversion freezes current output for structural visual editing.
- `app/data/catalog/palette.js` explicitly controls available drag elements and presets.
- `app/data/icons.js` maps semantic actions to symbols that exist in Zaux.

## 2026-09-07 - testing ownership and styling

- Until further notice, skip the testing phase; the user handles browser testing. Do not use automated tests, browser checks, validators, or production builds as verification.
- Add a token-style editor matching Zaux ConfigStyles while preserving the read-only dependency.

## 2026-09-07 - response length when blocked

- If commands or tools cannot be used because of permissions or environment state, keep the reply to the minimum: state the block and what is needed, nothing else. No explanations, summaries or unused code until the block is resolved.
- Preferred format: `Bloccato: <motivo in una riga>` / `Serve: <azione o permesso richiesto>`.

## 2026-09-18 - ZVC/ZVP import formats

- **ZVC from JSON** and **ZVP from JSON** expose a JSON format select with two options: the workspace-compatible definition/envelope, and the simple Zaux `{ name, props }` format written the Zaux way.
- In the simple format the conversion to a compatible ZVC/ZVP happens in the code. Prop values stay literal; no fields are generated from props. Editable field metadata is declared optionally through a `fields` array, with `children` and `label` also optional.
- The same dialog offers an opt-out checkbox, selected by default, that transposes the imported content into builder-editable elements: `ComponentsRenderer` wrappers and `Zsection` component content become Structure nodes instead of content properties, reusing the native-source projection in `domain/source-zvc.js`.
- The imported library name follows `label`, then a declared `ZVCName`/`ZVPName` (runtime descriptors), then the first node of the resulting tree, so rendered snapshots do not all become the same entry named after their first section.

## 2026-10-07 - Figma-like workspace layout (user)

- Overhaul the editor arrangement to maximize canvas space and practicality, as close to Figma as possible, while keeping the existing components and abstractions (BuilderButton, BuilderDropdown, BuilderInput, panels, Zaux components).
- One slim top bar, tabbed left panel (Structure with templates as pages, Library, Elements), canvas toolbar with zoom, compact Inspector. Panel sizes are per-browser preferences; zoom and collapsed panels are session UI state, never project data.
