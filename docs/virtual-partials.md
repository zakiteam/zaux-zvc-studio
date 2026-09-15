# Virtual partials (ZVP)

## Create and use a project partial

1. Open Library, use the **Create** dropdown and choose **New ZVP**. The same menu offers New ZVC, ZVC from JSON and ZVP from JSON. Give the partial a name.
2. Build its tree using Elements. Add editable fields in Fields and bind node properties to those fields.
3. Return to the template. Drag the partial from Library or Elements into a visual node, before/after a node, or inside a supported container. **Insert node** also inserts it into the current template.
4. Select the inserted node to edit its configured fields in Data (also available in Properties). In SliderSingle, SliderMultiple or HeroSliderSection, use **Add slide** and choose the ZVP.

Partials support text, textarea, number, switch, select, JSON, HTML, CSS, button, button group and component fields, using the same controls as native ZVC metadata. Structured button/component values use JSON controls. Image fields use the media picker. Select options accept typed JSON values and custom values. `showIf` accepts native field/operator/value conditions; hiding a field retains its value. Parent fields can be bound to partial properties.

The library displays the exact descriptor name, for example:

```js
{ name: 'ZVPProjectCard', props: { title: 'A new card', showImage: false } }
```

The slider editor adds `type: 'component'` as required by Zaux. The resolver also accepts descriptors without it. An owner stores an independent copy of each referenced partial under `definition.partials`; every occurrence has its own props. Subsequent library edits or deletion do not replace existing copies. A new library copy receives a distinct name and can be selected separately. Native source implementations remain shared through sourceKey.

## Define a partial in the repository

The included example is:

```text
app/zvc/_partials/projectcard/
  ProjectCard.zvp.js
  ProjectCard.meta.js
  data/ProjectCard.defaults.js
```

Vite loads `.zvp.js` modules automatically, including the read-only upstream virtual folders. A bare Zaux partial only needs a default export with `buildNode(data, params)`. Optional `ZVPName` defaults to `ZVP` plus the filename; optional `label`, `fields` and `builder: false` follow source-library conventions. Conventional defaults load from `data/Name.defaults.js`. Metadata must be spread into the exported module, as in the example.

The syntax follows the upstream generator at `vendor/zaux/.zaux/scripts/components/create-virtual-zvp.js`: construct `{ node: ... }` and return `ZVCHelper.renderNode(nodeObject, data, params)`, without ZVC section metadata. The project example includes an image, text, a conditional button, typed select options and independent defaults.

You may also import the partial directly from another source module and call `ProjectCard.buildNode(data, params)`. Relative imports within app/zvc are carried into source exports. Reload after adding source files; production installations need their ordinary rebuild. Studio never evaluates pasted JavaScript.

## Export

Select the ZVP and use the existing component JavaScript export. Visual partials produce `.zvp.js`, `.meta.js`, `data/*.defaults.js` and authored CSS. Native partials preserve their source implementation. Editable JSON also retains kind and captured dependencies.

Owners referencing partials include independent `_partials/<exportName>/` folders and `resolve-partials.js`. This pure helper expands partial references before returning nodes. It puts the entire partial tree into `ComponentsRenderer.props.components`: Zaux slider dynamic rendering forwards only name and props, so plain children on a slide descriptor would otherwise be lost.

The **Zaux starter package** additionally exports library partials under `project/components/virtual/_partials/<name>/`. The manifest records their kind. Template-only export includes the selected template's captured dependencies. Partial modules are imported and called with buildNode; they are not Vue components and the pinned upstream index generator does not register `.zvp.js` modules automatically.

If an exported tree uses named content slots or trigger children, register the included StudioComponentsRenderer adapter after destination Zaux setup, as described in the exported README. Package imports, aliases and computed import paths remain destination dependencies. Missing native modules block JavaScript export; JSON retains saved trees for recovery. Media and fonts remain URL references.

## Verification

Source and diffs were reviewed. No automated tests, validators, browser checks or production builds were run, following project instructions. Runtime and destination-export verification remain with the user.

## Files changed

| File | Change |
| --- | --- |
| `app/components/builder/BuilderDialog.vue` | New ZVP naming dialog. |
| `app/components/builder/BuilderSidebar.vue` | Creation, badges, palette and insertion. |
| `app/components/builder/BuilderCanvas.vue` | Compile CSS from resolved partial trees. |
| `app/components/builder/fields/BuilderPartialFields.vue` | Shared partial field editor. |
| `app/components/builder/fields/slides/BuilderSliderSlides.vue` | ZVP slide choices and field editing. |
| `app/components/builder/inspector/BuilderInspectorFieldsTab.vue` | Native field types, typed options and showIf. |
| `app/components/builder/inspector/BuilderInspectorPropertiesTab.vue` | Partial node fields and bindings. |
| `app/composables/useBuilder.js` | Creation, unique names, copies and insertion. |
| `app/data/locale/it.json` | Italian labels and export hint. |
| `app/data/locale/en.json` | English labels and export hint. |
| `app/pages/preview.vue` | Include dependency CSS. |
| `app/plugins/zaux.client.js` | Register the slot renderer for nested dynamic content. |
| `app/services/preview.js` | Load trusted source registry in preview. |
| `app/services/source-zvc.js` | Source discovery, dependencies and portable exports. |
| `app/zvc/_partials/projectcard/ProjectCard.zvp.js` | Native example card. |
| `app/zvc/_partials/projectcard/ProjectCard.meta.js` | Example fields and conditions. |
| `app/zvc/_partials/projectcard/data/ProjectCard.defaults.js` | Example values. |
| `domain/export.js` | Native-format visual ZVP generation. |
| `domain/nodes.js` | Runtime partial expansion and per-occurrence source data. |
| `domain/partials.js` | Independent dependency snapshots and CSS. |
| `domain/source-runtime.js` | In-memory trusted source registry. |
| `domain/source-files.js` | Relative source dependency packaging. |
| `domain/source-zvc.js` | Native partial definition adaptation. |
| `domain/starter-export.js` | Partial entries, folders and dependency identity. |
| `domain/validation.js` | Optional partial kind and nested definitions. |
| `domain/workspace.js` | Partial creation and naming. |
| `integrations/zaux/partial-renderer.js` | Portable dynamic descriptor resolver. |
| `integrations/zaux/source-library.js` | Read-only upstream partial discovery. |
| `docs/architecture.md` | Ownership and runtime integration. |
| `docs/code-components.md` | Updated source-library conventions. |
| `docs/data-format.md` | Optional schema and export contract. |
| `docs/virtual-partials.md` | Usage, example, limits and file inventory. |

## Instance editing and library navigation

Library has separate ZVC and ZVP tabs, with the existing search and Imported/Project filter applied to the selected kind. Selecting, creating or importing a definition activates its matching tab. The Create dropdown groups all four creation actions. ZVP from JSON accepts editable partial definitions/envelopes, visual ZVC definitions and compact Zaux nodes, preserving fields, values and dependencies. A native ZVC source cannot be relabeled as a ZVP source.

Selecting a partial node opens its Data editor. The same field editor is used in Properties and for partial slides; it respects configured types, showIf, typed/custom options, image controls, bindings and edit permissions. Native source bases remain unchanged.

Restore from library restores the selected node or slide using the existing ZVC restoration policy: preserve content/data, restore structure, field metadata and styles. The operation creates an independent captured dependency with a unique descriptor name, so other occurrences in the same template are not changed. Its optional libraryId keeps the original library identity for subsequent restores, including after renaming. The entire restoration is one undoable commit. A deleted library original disables restoration.

### Files changed for this refinement

- `app/components/builder/BuilderSidebar.vue`: creation dropdown, separate tabs and combined filtering.
- `app/components/builder/BuilderDialog.vue`: ZVP JSON example, parsing and import dialog.
- `app/components/builder/fields/BuilderPartialFields.vue`: configured instance controls, edit guards and restoration action.
- `app/components/builder/fields/slides/BuilderSliderSlides.vue`: pass the selected occurrence to restoration.
- `app/components/builder/inspector/BuilderInspectorDataTab.vue`: selected partial fields in Data.
- `app/components/builder/inspector/BuilderInspectorPropertiesTab.vue`: selected node restoration reference.
- `app/composables/useBuilder.js`: kind selection, Data routing and atomic restore commits.
- `app/data/locale/it.json`, `app/data/locale/en.json`: creation, tab, import and restoration labels.
- `domain/export.js`: ZVP-specific JSON import.
- `domain/partials.js`: original lookup and isolated occurrence restoration.
- `docs/virtual-partials.md`: updated usage and change inventory.

Source and diffs only were reviewed; no tests, builds, validators or browser checks were run. Runtime verification remains with the user.

### Restore copy visibility

Restore reuses the captured dependency when only the selected occurrence references it. A separate internal dependency is allocated only when needed to preserve other occurrences. Internal restore copies are excluded from Elements and Add slide choices; existing occurrences still resolve their own definitions and configured fields. Unused internal copies left by older restores are removed during restoration. The library itself is not duplicated.

Changed files: `domain/partials.js` (reuse and cleanup), `app/composables/useBuilder.js` (separate insertion choices from runtime dependencies), `app/components/builder/BuilderSidebar.vue` and `app/components/builder/fields/slides/BuilderSliderSlides.vue` (filtered choices), and this document. Runtime remains unverified; no tests or builds were run.
