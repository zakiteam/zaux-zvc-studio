# Component Theme editor

Open **Theme editor** next to **Design tokens** in the project toolbar. **Design** returns to the builder. The project header, save status, undo/redo and dialogs remain shared. The builder workbench is now `BuilderDesignView`; `BuilderWorkspace` owns view placement and the project lifecycle. The future developer view is not implemented.

## Editing

The left sidebar lists the component theme files which declare CSS custom properties in the pinned Zaux dependency. The project preparation script compiles their Sass and records actual selectors, theme names, variable declarations and conditional contexts. Files without declarations do not create empty entries. Shared fragments such as Input and InputShared preview through InputText. Nothing is generated inside the submodule.

Select a theme, then a CSS selector/context. **Base / states / sizes** exposes selectors which are not tied to a named theme, including root defaults and state/size rules. The fields show source defaults as placeholders and save only authored overrides. Source placeholders are not computed browser values: the cascade, size rules, ancestors and runtime component props may take precedence. Referenced component variables without declarations remain editable with an inherited/fallback placeholder. Clear a field or use its reset control to remove that override.

Keep the value syntax used by the original variable. Many Zaux color variables contain RGB channels (`255 0 0`) or `var(--zx-color-set1-accent)`, rather than hex colors. Other variables accept lengths, numeric values and CSS expressions. The editor checks CSS syntax, not whether every value is meaningful for the property that consumes it.

Color fields include a circular sample and a **Tokens** dropdown grouped by Zaux palette. Samples use project token values independently of Studio light/dark mode. Selecting a token stores its CSS variable reference, wrapped in `rgb()` when the source default expects a complete color; manual CSS entry and reset remain available. Samples reflect the displayed declaration and its known variable references, not the full component cascade.

**CSS source** edits the same per-component CSS used by the fields. It accepts complete CSS including comments, additional declarations, selectors and media queries. **Apply CSS** commits the draft through workspace validation, undo and autosave. Invalid CSS remains a draft. UI edits preserve unrelated authored CSS. Custom selectors with CSS nesting remain available through the source editor; the variable controls handle flat selectors and enclosing at-rules.

A pending source draft disables variable editing until applied or discarded. Drafts stay available when switching components or returning to Design during the same open workspace. They are not persisted and should be applied before leaving or reloading the project. Downloads contain applied CSS only.

## Preview

The preview uses the actual Zaux components through the existing `/preview` renderer, with the project's design tokens, fonts, UI settings and all applied component theme CSS. This CSS also appears in the ordinary builder canvas; it does not style Studio itself.

Theme, sample size and background are transient. ZButton additionally exposes the actual upstream hover/focus/active/disabled class states. Other components can be interacted with directly. **Preview properties** exposes fields derived from an explicit, component-specific sample. Switches, numeric/text fields, enum selects and nested JSON use the shared builder controls. The **Preview JSON properties** tab remains available for advanced edits; apply or discard its draft before returning to field editing. These edits do not change templates or library definitions. Theme and size remain controlled by the preview selectors. **Reload preview** restarts interactive samples, such as closed dialogs and notifications. Complex samples may require adjusting their properties to expose a particular internal state or layout.

## Persistence and exports

The optional version-1 workspace field `componentThemes` stores an array of `{ component, css }` entries. Absence means no overrides. The field is independent of design-token presets, survives full workspace JSON import/export and follows existing browser/remote project saves, revision handling, read-only permissions and undo/redo. Templates and library instances remain independent of each other; project theme CSS intentionally affects every matching component in that project's preview.

**Export component CSS** downloads all applied edits for the selected component, across its themes and contexts. **Export all theme CSS** combines all modified components in the same order used by the preview. Exports omit untouched source defaults. Include the result after the destination project's Zaux styles and ensure the referenced project design tokens/fonts are installed there. The component JavaScript ZIP also includes `component-themes.css` when the project has theme overrides. Component/template-only editable JSON and runtime JSON keep their existing contracts; export CSS separately when using them.

## Files and verification

- `scripts/zaux/theme-catalog.mjs` reads upstream Sass and writes `integrations/zaux/generated/component-themes.json`; `prepare.mjs` invokes it during normal project preparation.
- `integrations/zaux/theme-preview.js` adapts theme fragments and sample props to actual component implementations.
- `domain/component-themes.js` owns syntax parsing, variable mutations and CSS exports; workspace validation checks the optional data.
- `BuilderThemeEditor.vue` owns the editing view and transient drafts; `BuilderThemePreview.vue` owns the iframe integration.

The catalog was generated as an implementation artifact. Source and diffs were reviewed only. No tests, browser automation, validators or production builds were run. Runtime and visual verification remain with the user.

## Maintaining component samples

`integrations/zaux/theme-preview-presets.js` contains explicit presets for all 51 current stylesheet entries, independently of the insertion palette. `theme-preview.js` maps known stylesheet aliases to real components and exposes typed field descriptors and sample sizes. New stylesheet entries without a reviewed preset show a missing-preview message; no generic prop bag is assigned.

Accordion starts open, wrapped and boxed, with HTML content and editable icons, border and roundness options. Dropdown and breadcrumb records use their nested renderer contracts; sliders contain populated component slides. Input samples expose their actual state/selection values. ListColumned needs project-owned root/item theme hooks because its pinned implementation imports List.meta. Toast uses a preview-only lifecycle adapter with the native notification store so it stays visible while editing and is cleaned up on sample changes.

The reusable repository skill is [`zaux-theme-preview-props`](../.agents/skills/zaux-theme-preview-props/SKILL.md). It directs future work to native props, templates, nested renderer contracts and theme selectors before extending presets or editable fields.

Source contracts and diffs were reviewed for this update. No automated tests, skill validators, browser checks or production builds were run; runtime behavior remains pending manual verification.
