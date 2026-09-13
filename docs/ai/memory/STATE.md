# Session state

Date: 2026-09-07.

## Active instructions
Until further notice, skip tests and the verification phase. The user performs browser checks. Do not run automated tests, browser automation, validators or production builds as verification. Source reading is permitted. This overrides older testing guidance.

When commands or tools are blocked by permissions or environment state, reply with the minimum: state the block and what is needed, nothing else. Format: `Bloccato: <motivo>` / `Serve: <azione o permesso>`. See docs/ai/decisions.md.

## Implemented before current styling request
Nuxt 4 / JavaScript editor with read-only Zaux submodule; independent template/library copies; visual editing; JSON and JS exports; persistence/recovery; native source modules in app/zvc; whitelist in app/data/catalog/palette.js; duplicate/delete outline controls and valid Zaux icon aliases.

## Current work
Integrate Zaux token style configuration and migrate Studio styling to Tailwind with the Zaux palette.

## Known state
A production check before the stop instruction exposed Tailwind trying to read preflight.css from Nitro output. The runtime endpoint now disables preflight because it compiles utilities only; this source fix was applied but has not been re-verified. Do not resume testing automatically.

Zaux is read-only. See docs/code-components.md for native ZVC conventions.
