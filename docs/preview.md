# Project backgrounds and standalone preview

A compact background row below the Design toolbar groups the project body token selector and clear button, followed by a light/dark canvas selector with color swatches and an explicit selected state. The color is stored in `workspace.styles.bodyBackground`, participates in undo/redo and is shared by the project templates. Reset removes the override.

The canvas light/dark toggle is a session-only viewing preference, independent of the Studio theme. It changes the canvas surroundings and the preview background when no explicit body color is set. An explicit body color takes precedence. This helps inspect white content before choosing the final project background.

In Preview mode, Hide header / Show header sits beside the Design/Preview switch and toggles the Studio header. The canvas toolbar remains available to restore it. Leaving Preview shows the header again.

## Standalone page

The primary Open preview page button sits beside Export in the Studio header and uses the normal play icon, with no action icon. Import and Export share the secondary theme without icons. The preview button opens the current template or library component in a new tab without Studio controls, selection outlines or empty-builder placeholders. It uses the same `/preview` renderer in a full-window iframe.

Routes:

- `/view/local?template=<template-id>` for a local project.
- `/view/<project-id>?template=<template-id>` for a remote project.
- Replace `template` with `component=<library-id>` to show a library definition.
- Add `canvas=dark` for the dark fallback background.

Opening the page captures the current workspace in a separate browser snapshot without replacing recovery data. Later saves from another tab in the same browser refresh the view, including undo/redo saves. The page prefers the browser draft; a remote document is the fallback when no local data exists. Local links require the originating browser data.

The page uses Studio authentication. Remote projects are fetched through the existing project access checks before local drafts are displayed. This is an authenticated preview, not a public publishing endpoint. The existing renderer's link and form behavior is unchanged.

## Data and exports

`bodyBackground` is optional. The selector lists Zaux color tokens with project color swatches and stores a live CSS reference such as `rgb(var(--zx-color-set1-white))`, so later token changes also update the background and exports. Previously saved hexadecimal colors and `transparent` remain supported; clearing the selector removes the override. Old documents need no migration. The CSS preset and starter/template `style/studio-tokens.css` include the body rule. Individual JavaScript component exports include `body-background.css` when configured; load that stylesheet in the consuming project. Canvas mode and header visibility are not exported.

## Changed files

| File | Responsibility |
| --- | --- |
| `app/components/builder/BuilderPreviewControls.vue` | Zaux body color token selector with clear action and light/dark canvas selector. |
| `app/components/builder/BuilderHeader.vue` | Matching Import/Export buttons and primary preview action with play icon. |
| `app/components/builder/BuilderDesignView.vue` | Separate background controls from viewport controls; place the header toggle beside Design/Preview. |
| `app/components/builder/BuilderWorkspace.vue` | Toggle the shared header in Preview mode. |
| `app/components/builder/BuilderCanvas.vue` | Canvas colors and renderer state. |
| `app/components/builder/BuilderDialog.vue` | Body stylesheet in individual JavaScript exports. |
| `app/composables/useBuilder.js` | Project color mutations and preview actions/state. |
| `app/services/preview-page.js` | Separate opening snapshots, route construction and saved-draft selection. |
| `app/pages/view/[id].vue` | Authenticated standalone preview and saved-draft refresh. |
| `app/pages/preview.vue` | Body background and clean rendering without placeholders. |
| `app/app.vue` | Exclude preview pages from Studio theme overrides. |
| `app/services/styles.js` | Apply project body rules only to the preview document. |
| `domain/styles.js` | Optional body color validation and CSS export. |
| `app/data/locale/it.json`, `app/data/locale/en.json` | Localized controls and errors. |
| `docs/preview.md`, `docs/architecture.md`, `docs/data-format.md` | Usage, ownership and persistence/export contracts. |

Source and diffs reviewed only. No tests, browser automation, validators or production builds were run; runtime verification remains with the user.
