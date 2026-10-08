# Global components and Component designer

Global ZVC/ZVPs are shared by every project and stored outside project documents. They are
edited only in the **Component designer**, an isolated editor, and enter a project as a
**linked copy** after a Zaux version check approved by the user.

## Storage

Supabase table `public.global_components` (migration `20261008120000_global_components.sql`),
one row per component: `id` (uuid, equal to the definition id), `kind`, `name`, `export_name`,
`definition` (ordinary Studio definition JSON), `zaux_version` (signature), `thumbnail` (JPEG
data URL, hub only), `revision`, owner/updater and timestamps, `archived_at` (soft delete).
Every active user reads, creates and edits; removal is an archive (no delete grant). The trigger
bumps `revision` on content changes only, so thumbnail updates never look like new versions.

`app/services/global-components.js` owns the IO; pure logic is in `domain/global-components.js`.

## Component designer (`/designer`, `?component=<id>`)

`BuilderWorkspace designer` creates the builder with `createBuilder({ designer: true })`. The
editor is the same as ZVC/ZVP editing in a project (canvas, outline, inspector, variants, code,
Elements, command palette, JSON imports in Workspace or simple Zaux format) with these differences:

- the workspace is synthetic: the library holds the global components plus the bundled source
  bases (Imported category, usable as starting points); mode is always `library`; there are no
  templates, pages, instances, project bridge or Sync/Reset instance buttons;
- persistence is `app/composables/globalDesigner.js`: each commit is diffed per component
  against the last saved JSON and written row by row (insert, revision-matched update, archive
  on delete); no localStorage copy. Every write signs the row with the running
  `zauxProjectVersion`. A revision mismatch shows a conflict notice with "Reload library";
- design tokens, fonts and Theme editor changes only try out looks: they are never saved and
  never stored in components (notice in both panels);
- library cards show the hub thumbnail when present (otherwise the usual local preview); the
  manual preview image button is hidden;
- an empty global library is seeded on first open with a sample ZVP (`Global CTA`) and a ZVC
  (`Global feature`) that references it (`sampleGlobalDefinitions`).

The standalone preview page works with the `designer` id (opening snapshot only).

## Hub management (`/components`)

Hub navigation entry "Component designer". Lists the global library (search, kind filter, Zaux
signature with mismatch highlight, revision, last update), opens components in the designer,
archives them, and is the only place where thumbnails are generated: per component or in batch
(missing / all), rendered with the default Zaux style preset through the existing capture
pipeline and saved in `thumbnail`.

## Projects

Library category **Global** (`BuilderGlobalLibrary.vue`) merges the catalog with the project's
linked copies. A linked copy is a library definition whose `id` is the global id plus
`global: { id, revision, zauxVersion, updatedAt }` (see [data format](data-format.md)). Because
instances keep `sourceId`, every existing mechanism (Soft/Hard reset, nested ZVP capture by
`libraryId`/id, exports) works unchanged. Linked copies are hidden from the Project category,
cannot be opened in place (`selectLibrary` opens the designer in a new tab) and lose `global`
when duplicated or copied into instances (`copyDefinition`, `capturePartials`).

- **Import / Insert**: `BuilderGlobalDialog` (`global-import`) reads the latest row, compares its
  signature with the running Zaux release and with the project's `zauxEditedVersion` when present
  (`globalVersionCheck`), and requires the risk-acceptance checkbox when they differ; confirming links the copy (and inserts it for Insert). A ZVP gets a unique export name.
  Cards not yet imported can also be dragged: the `global` drag payload (`{ kind: 'global', id, zvp }`)
  is accepted like a library ZVC or a palette ZVP, and its drop opens the same dialog, then inserts
  at the captured drop target (`dropGlobal` → `dropElement`). Linked copies drag like project components.
- **Inserting a linked copy** (click or drag from the Global category) runs the same comparison on
  `global.zauxVersion`; a mismatch opens `BuilderZauxVersionDialog` (`{ type: 'zaux-version', scope:
  'global', id, insert }`) before `insertApprovedGlobal` inserts it. Approvals (here, in the import
  dialog or a sync pull) are remembered per component and signature for the editor session.
- **Reset** (`global-sync`): from the card menu for all instances (Soft reset, Hard reset, or only
  "Update linked copy"), from the instance right-click menu for one instance. The dialog offers
  to pull the latest revision first (default on when newer, same version check), then applies
  `syncLibraryInstances`/`resetLibraryInstances` or the single-instance equivalents in one
  undoable commit. A ZVP refresh keeps the project export name so references stay valid.
- A linked copy whose global row was archived stays usable and resettable from the local copy.

Terminology (user, 2026-10-08): **Soft reset** restores structure and styles keeping data and
properties (formerly "Sync with original"/"Sync instances"); **Hard reset** replaces copies,
discarding data and edits (formerly "Reset instance"/"Reset instances").

## Limits

Global partial snapshots inside a global ZVC are captured at save time, like any ZVC.
Source-backed global copies depend on the bundled source of the running builder. Two designer
tabs editing the same component resolve through the conflict notice. Runtime behavior has not
been verified (source reading only); the migration must be applied to the Supabase project.
