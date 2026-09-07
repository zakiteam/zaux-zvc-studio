# Zaux Studio agent instructions

Read `docs/ai/INDEX.md` first, then `docs/ai/memory/STATE.md` and the relevant architecture section.

## Ownership and implementation
- `vendor/zaux` is a Git submodule and is read-only. Never edit it, generate files in it, run its setup scripts, commit in it, or change its tracked revision unless the user asks to update the dependency.
- Project code uses JavaScript and Vue Composition API with ordinary `<script>`, `defineComponent` and `setup()`. Do not introduce TypeScript or `<script setup>`.
- Follow the closest project component. Keep domain transformations in `domain/`, browser IO in `app/services/`, and editor state in `app/composables/useBuilder.js`.
- Use actual Zaux components, tokens and styles. Adapt integration in `integrations/zaux/`, `scripts/zaux/` and `nuxt.config.js`; do not fork its components.
- Template instances contain independent copies of library definitions. Updating a library ZVC must never mutate existing instances.
- Persist only JSON data, never Vue objects, functions or executable strings. Preserve literal false, zero, empty strings and null.
- UI strings belong in both `app/data/locale/it.json` and `en.json`, accessed with `translate('zx_builder_…')`.
- Keep new root files to framework/tool entrypoints. Place documentation and session notes under `docs/`.

## Validation — user preference, 2026-09-07
Until the user explicitly changes this instruction, skip the testing phase. Do not run automated tests, Playwright/browser checks, test/skill validators, or production builds as validation. The user handles manual browser testing. Read source and diffs as needed to implement changes, and report that runtime verification is left to the user. Do not claim unverified behavior as tested.

## Knowledge
Use the project skill `$zaux-builder-work` for ongoing implementation. Keep decision records and the session state concise. Project memory is in `docs/ai/memory/`; user-level Codex memory is a separate system.
