---
name: zaux-palette-props
description: >-
  Expose initial editable properties on Zaux Studio palette components. Use when
  fields should already appear in the Properties tab after insertion, or when
  adding a palette component with suitable property controls.
---

# Zaux palette properties

Project: `C:/xampp/htdocs/zaki/zaux-builder`. Read its `AGENTS.md`,
`docs/ai/INDEX.md`, and `docs/property-decorators.md` before editing.

## Choose the correct entry point

- Initial authored properties: `app/data/catalog/palette.js` or the catalog module
  that owns the component entry. Some entries derive from `sliderControls`.
- Control metadata: `integrations/zaux/property-decorators.js`.
- Existing source metadata is already adapted in `property-descriptors.js`.
  Reuse it instead of duplicating option lists.

`catalogNode()` in `app/services/catalog.js` copies the preset into each new node.
`BuilderInspectorPropertiesTab.vue` renders authored prop keys immediately;
remaining descriptor keys go under Add properties. A decorator alone does not
make a missing prop immediately visible. A preset alone does not define a select,
image picker, or nested editor.

## Implementation

1. Find the exact registered name in `integrations/zaux/generated/core-*.js` and
   inspect its Vue props, metadata, and closest palette sibling. Keep Zaux read-only.
2. Add only the requested initial keys to the owning preset, preserving other
   values. Use JSON values matching the real component contract. Use `createProps(t)`
   and both locale files when introducing visible sample text; an empty optional
   string needs no translation. Do not execute component default functions.
3. Reuse source-backed descriptors first. Add missing editor rules to the decorator
   registry: `selectOptions`, `image`, `control`, `properties`, or `items` as documented.
   Do not add component-specific descriptor branches to the Inspector.
4. Preserve bindings, custom values, false, zero, empty strings and null. For optional
   text, an empty-string insertion preset makes a text editor available without
   rendering sample content; existing explicit null values retain their JSON type.
5. Explain that preset changes affect new insertions and switches using catalogNode,
   not previously saved nodes. Existing nodes can use Add properties. Do not migrate
   saved instances unless requested. If visibility on existing nodes is requested,
   implement it explicitly without silently changing their authored data.

## IntroText example

In its palette preset, `theme: 'light1'` and `subtitle: ''` expose both fields on
new nodes. Theme choices `light1` and `dark1` already come from IntroText.meta.js.
The subtitle textarea is a rule under `propertyDecorators.IntroText`.

Follow the project's validation policy: no automated tests, browser checks,
validators or production builds until the user changes it. Review source and diffs;
report every changed file and leave runtime verification to the user.
