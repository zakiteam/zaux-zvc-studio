---
name: zaux-builder-work
description: Extend or maintain this Zaux Studio Nuxt builder, including visual editing, ZVC data models, exports, browser persistence and the read-only Zaux bridge.
---

# Zaux Studio work

Read `docs/ai/INDEX.md` and `docs/ai/memory/STATE.md` in the project before implementation. Use `docs/architecture.md` for file ownership and `docs/data-format.md` for schema/export changes.

Preserve the user-selected invariants:
- JavaScript, Composition API, ordinary script and setup().
- Read-only `vendor/zaux`; adapt imports and generated assets in the project bridge.
- Visual definitions and their template copies have independent structures and data. Native definitions retain independent configuration and share their imported source implementation; see docs/code-components.md.
- Exported JS follows Zaux's defaults + gv + buildNode + renderNode convention and works without the editor.
- All UI strings have Italian and English entries.

Start with the named panel/helper and its closest sibling. If modifying Zaux integration, inspect the pinned upstream files read-only and place the adaptation under `integrations/zaux` or `scripts/zaux`. Do not run upstream generation scripts.

User instruction from 2026-09-07: skip the testing phase until further notice. The user tests manually in the browser. Do not run tests, automated browser checks, validators or production builds for verification. Read source as needed and report unverified runtime behavior candidly. See root AGENTS.md.

When the user asks to capture progress, keep a concise project session note with changed files, verified results and open constraints. Never claim runtime behavior based only on static inspection.

## Builder illustrations and icons

For new representative UI illustrations or icons, create simple, readable SVG files under `public/assets/builder/` and reference them as `/assets/builder/<name>.svg`. Use descriptive filenames and a consistent viewBox; reuse these assets across controls. Pair icon controls with translated accessible labels and an explicit selected state. Keep this convention in project-owned code; do not add assets to `vendor/zaux`.
