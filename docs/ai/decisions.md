# Decisions

## 2026-09-06 — user-approved scope
- New independent project in `C:/xampp/htdocs/zaki/zaux-builder`.
- Nuxt 4, JavaScript only, Vue Composition API without script setup.
- Visual page builder: drag/drop and selection directly on the preview.
- Library of ZVC definitions; templates instantiate independent copies.
- Zaux as Git submodule, read-only; no direct changes to Zaux.
- Browser localStorage progress; JSON transport prepared for a future server.
- Export component JSON and conventional Zaux JS modules.
- Minimal translation function and semantically organized folders.
- AI knowledge, discoverable skill and project session memory.

## Implementation choices
- `vendor/zaux` holds the pinned dependency. Generated bridges live elsewhere.
- Client-rendered Nuxt editor and same-origin preview iframe.
- Explicit JSON `$bind` markers preserve editable data bindings.
- Pure domain helpers and one editor state composable; no generic framework or plugin engine.
- Visual source JS is generated from JSON. Trusted native modules in app/zvc are bundled by Vite and run as ordinary imports; JSON imports never execute source strings.
- Italian and English UI dictionaries.
- Nuxt uses a project-local Node runtime for compatibility with the host's older Node installation.

## 2026-09-07 — source ZVCs and editor ergonomics
- User requested native Zaux code definitions loaded as configured bases, a curated drag palette, direct outline duplicate/delete actions, and icon fixes.
- app/zvc contains ordinary Zaux modules; sourceKey tracks their code while copied values remain independent.
- Source bases are edited on disk. Configurable copies retain buildNode logic; conversion freezes current output for structural visual editing.
- app/data/catalog/palette.js explicitly controls available drag elements and presets.
- app/data/icons.js maps semantic actions to symbols that exist in Zaux.

## 2026-09-07 — testing ownership and styling
- Until further notice, skip the testing phase; the user handles browser testing. No automated tests, browser checks, validators or production builds as verification.
- Add a token style editor matching Zaux ConfigStyles, preserving the read-only dependency.
- Move Studio styling to Tailwind utilities and use a palette closer to Zaux instead of the earlier green theme.
