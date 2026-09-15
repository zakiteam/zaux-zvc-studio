---
name: zaux-property-decorators
description: Add or refine per-property editors in Zaux Studio through the project-owned decorator registry, including static selects, options derived from sibling props or current trees, and image fields. Use for Inspector prop interception and decoration; not for theme preview presets or multi-field slide editors.
---

# Zaux Studio property decorators

Target project: C:/xampp/htdocs/zaki/zaux-builder.

Read the project's AGENTS.md and docs/ai/INDEX.md, then
[Property decorators](C:/xampp/htdocs/zaki/zaux-builder/docs/property-decorators.md)
for the current contract and call chain.

## Workflow

- Inspect the actual Vue prop, source metadata and nearest existing decoration.
  Treat vendor/zaux as read-only. Use actual registered names, e.g. Icon.
- Add rules in integrations/zaux/property-decorators.js under component -> prop.
  Prefer selectOptions for typed enumerations; use existing image/control metadata
  for other supported editors.
- Use synchronous context functions for dependencies on props or trees. Do not
  mutate their inputs, execute component defaults, resolve bindings as literals
  or perform IO. Functions return metadata patches, never authored prop updates.
- Source choices from upstream metadata, tokens or bundled assets when possible.
  Icon symbols and sizes are already exposed by integrations/zaux/icon-options.js.
- Keep component-specific descriptor construction out of the Inspector. It passes
  current props/trees to catalog.propertyInfo; property-descriptors applies the
  registry after upstream metadata. If adding another context input, document
  and wire it through those same layers.
- Merge existing rules for a component. An explicit prop rule takes precedence
  over componentSelects for that prop; unrelated prop choices are retained.
- Add a palette preset only when insertion or an initially visible prop is
  needed. New UI text belongs in both locale JSON files.
- Preserve custom/out-of-list values, bindings and JSON types. The descriptor
  layer does not replace defaults or mutate existing instances.
- Update docs/property-decorators.md for contract changes. Report exact entry
  points and wiring, distinguishing source review from runtime evidence.

Honor the project's current validation preference: no automated tests, browser
checks, skill validators or production builds until the user changes it.