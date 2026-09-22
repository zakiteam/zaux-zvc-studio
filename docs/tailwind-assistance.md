# Tailwind class assistance

The Inspector Style tab uses `BuilderStyleInput` for literal class strings. Arrays,
conditional objects and bindings keep the JSON editor. Shared `BuilderInput` and
`BuilderValue` are unchanged. The input emits a changed string on blur or Enter
with the suggestions closed, retaining the existing `updateNode` / commit path.

## Interaction

Typing or moving the caret opens suggestions for that token. Arrow Up/Down selects
an entry, Tab/Enter inserts it, Escape dismisses the popup, and Ctrl+Space requests
suggestions explicitly (including in an empty field). Shift+Tab keeps normal focus
navigation. Completing a variant continues completion without inserting a space.
Completing a utility adds a space if needed. The rest of the class string is retained.
Selection ranges and IME composition suppress completion. The popup remains outside
the Inspector scroll clipping and closes on outside scrolling, resize and blur.

The selected suggestion displays compiled utility CSS, including responsive
and state wrappers. Declaration values in rem are displayed in pixels using a fixed
16px root size (for example, `1.5rem` becomes `24px`), including values inside `calc()`.
This display conversion leaves selectors, quoted strings, URLs, authored classes
and preview/export CSS unchanged. It does not measure the preview's root font size.
Arbitrary candidates can be typed freely and request their own
CSS when no catalog entry matches. Custom CSS classes need not appear in the catalog:
absence of utility CSS is not a validation error. Zaux CSS variables remain symbolic;
this is generated CSS, not browser computed styles or a custom stylesheet inspector.

## Ownership and dependency

- `domain/tailwind-assistance.js`: caret token boundaries, filtering and replacement.
- `app/components/builder/fields/BuilderStyleInput.vue`: isolated input, keyboard
  interaction, accessible listbox, session toggle, popup and request lifecycle.
- `app/services/tailwind-assistance.js`: lazy catalog IO and bounded CSS cache.
- `server/api/tailwind-assistance.post.js`: feature gate and candidate validation.
- `integrations/zaux/tailwind-assistance.js`: server-only Tailwind adapter. Catalog
  extraction uses `setupContextUtils.createContext`, `getClassList` and `getVariants`
  from the already pinned Tailwind **3.4.17**. These are internal APIs: review this
  adapter when upgrading Tailwind. CSS uses its PostCSS compiler and the same project
  config as the preview, with preflight/content scanning disabled and an exact
  candidate safelist. Catalog includes project tokens, registered utilities,
  variants and enumerated modifiers; arbitrary values are not exhaustively listed.

Nitro explicitly inlines `domain/` alongside the Zaux integration so the server-side
rem display formatter is bundled. Otherwise development output can externalize its
relative import into an incorrect Windows path such as `C:\domain\tailwind-assistance.js`.

No new package is needed. `@xengine/tailwindcss-class-parser` offers class/AST
conversion rather than this project's compiled CSS, so it is not used.

## Disable or detach

The input's translated suggestions toggle disables assistance across these inputs
for the current editor session. The plain input remains usable and no new assistance
requests are made while disabled. Reloading restores the default. Set the component's
`assistance` prop to `false` to opt out at an individual call site.

For a deployment-wide switch, set `NUXT_PUBLIC_TAILWIND_ASSISTANCE=false` and restart
the server, or set `runtimeConfig.public.tailwindAssistance` to `false` in
`nuxt.config.js`. This hides the toggle, disables requests and rejects the endpoint.
The feature stores no workspace data and changes no exports. To remove it, replace
the Style tab component with the former `BuilderValue type="text"` and remove the
five dedicated files listed above plus the config flag and locale keys.

CSS requests are debounced, cancelled on close/change, and stale responses ignored.
Both client and server CSS caches are capped at 100 entries. Network failures leave
plain class editing available. The assistance endpoint needs the Nuxt server, as does
the existing runtime preview compiler.

Source review only. No tests, browser automation, validators or builds were run;
keyboard behavior, popup placement and runtime compilation require manual verification.
