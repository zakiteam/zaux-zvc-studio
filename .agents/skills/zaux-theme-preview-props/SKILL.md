---
name: zaux-theme-preview-props
description: Define or refine source-backed sample props and editable fields for Zaux Studio Theme editor components. Use when adding themed components or fixing incomplete, blank or inappropriate theme previews; not for changing Zaux internals or general palette expansion.
---

# Zaux Theme preview props

Maintain concrete, editable samples of the actual Zaux components. A theme stylesheet is not sufficient evidence of the component's prop contract.

## Locate the implementation

Use the active Zaux Studio repository (normally `C:/xampp/htdocs/zaki/zaux-builder`). Read its `AGENTS.md`, `docs/ai/INDEX.md`, session state and the relevant architecture section. The project skill `zaux-builder-work` contains ownership constraints.

Start with:
- `integrations/zaux/theme/theme-preview-presets.js`: explicit sample props, children, select choices and sample sizes.
- `integrations/zaux/theme/theme-preview.js`: stylesheet/component aliases and typed field descriptors.
- `app/components/builder/BuilderThemeProps.vue`: shared prop controls and advanced JSON.
- `app/components/builder/BuilderThemeEditor.vue`: sample selection and transient theme/size controls.
- `integrations/zaux/generated/component-themes.json`: the currently available stylesheet IDs and actual CSS selectors. This is generated data, not the edit destination.

## Establish the real contract

For each requested component, locate its `.vue`, `.meta.js`, `.theme.scss` and relevant story/type data under read-only `vendor/zaux`. Inspect the template and setup as well as the declared props. Follow child components when they consume nested data. Do not assume that `title`, `label`, `excerpt`, `content` and `contentHTML` are interchangeable.

Identify:
- Data necessary to render useful content, including array item shapes and required object props.
- Named slots versus content props, including precedence: an example slot can mask the content field the user edits.
- Exact spellings, types, supported enum values and styled sizes.
- Which props activate the theme selectors: wrapped/boxed/open, checked, disabled, icons, overlays, layout and media.
- State initialization and visibility: a declared prop may feed a store, emit a value rather than consume it, or need a mounted transition.
- Whether the component really emits the class named by its stylesheet. Document source mismatches; only add a project-owned preview adapter where the source proves it is needed.

Examples from the current integration:
- Accordion consumes HTML in `content`; use a populated, initially open wrapped/boxed sample with title/action icons and border controls. Do not leave the editable content empty behind a populated slot.
- Abstract uses `text`; ButtonBlock uses an object `content`; Dropdown items feed Snippetlabel and need `title` plus `type: 'option'` for interactive choices; Breadcrumbs feed Zlink and need `label`.
- Slider samples need nonempty `type: 'component'`, `name`, `props` entries; SliderCaptioned additionally reads `caption`. Do not inherit an empty insertion-palette slide array.
- Checkboxes/radios and selection groups differ in their handling of `checked`, `modelValue` and `options[].active`. Avoid exposing contradictory sources of selection state.
- The Input and InputShared stylesheet IDs render InputText; richtext renders RichText; Slider renders SliderSingle. Preserve these explicit aliases.
- ListColumned currently imports List.meta. Its preview has explicit root/item theme hooks; do not modify upstream metadata.
- Toast is store-driven and normally expires. The preview lifecycle in `app/services/theme-preview.js` shows it through the native helper with permanent duration and disposes only its own sample.

## Implement the sample and fields

Add or update the explicit preset keyed by the stylesheet ID. Use `props`, optional `children`, `selects` and `sizes`; `themeClass` is only for an evidenced class mismatch. Reuse small data fragments only where the native contracts match. Keep factories readable and output JSON-compatible values; clone each selected sample so nested arrays/objects are independent.

Include only pertinent props. Do not restore the generic catch-all prop bag or silently use a palette default for an unreviewed component. The missing-preset UI should remain visible for components without an explicit sample. Do not change insertion presets unless the user also requested that scope.

Curated sample values drive the existing typed fields: booleans, numbers, text/HTML, structured JSON and explicit enum choices. Theme and size live in the toolbar. Runtime identities and activation plumbing stay out of the ordinary field list. Use shared BuilderValue/BuilderInput/BuilderCodeEditor controls; preserve the advanced JSON route, literal false/zero/null values and unapplied drafts. Identifiers shown as prop keys are code names; user-facing prose belongs in both locale dictionaries.

Preview changes must remain transient. They must not modify templates, library instances, saved project CSS or palette definitions. Render actual registered Zaux components in the existing isolated iframe. Keep IO/lifecycle integration in `app/services/`, JSON transformations in `domain/` when needed, and dependency adaptations in `integrations/zaux/`.

## Finish

Review the changed sources and diffs, including nested renderer contracts and every current catalog ID in scope. Follow the repository's active validation policy: while it forbids tests, browser automation, validators and production builds, do not run them. State that runtime verification remains manual. Update `docs/theme-editor.md` with material behavior or source limitations and list every modified file in the completion report.
