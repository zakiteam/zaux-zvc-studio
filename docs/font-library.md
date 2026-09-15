# Font library

## Setup and access

Apply `supabase/migrations/20260914130000_font_library.sql` after the existing profiles/project migrations. The shared `font_library` catalog is readable by all active Studio users. Active users can create records; only each record's author can edit or archive it. Database grants prevent changing ownership. Updates and archiving match the last `updated_at` timestamp to avoid overwriting a concurrent change.

Open **Font library** in the dashboard sidebar to add, edit, search or archive a family. Paste an HTTPS CSS URL or a stylesheet `<link>` snippet and enter the CSS family name without quotes. Only the stylesheet URL is stored; pasted HTML and event attributes are never inserted into the page. Google Fonts snippets may include preconnect links, but must contain exactly one stylesheet link. Google URLs suggest the first family name; for additional families, add another entry using the same URL. Adobe Fonts/Typekit and custom CSS require the exact family name provided in the stylesheet/provider interface; the app does not infer family names by downloading cross-origin CSS.

The URL must serve CSS containing font definitions, not a font binary or a provider's catalog page. Existing query parameters (weights, styles and display options) are preserved. Use the CSS embed URL from [Google Fonts](https://developers.google.com/fonts/docs/getting_started) or [Adobe Fonts](https://helpx.adobe.com/fonts/web/web-design-and-development/embed-codes.html). Provider font availability and the provider's web-project settings remain external to Studio.

## Project selection and rendering

Open **Project fonts** in the project menu or Style settings. Select multiple families and press **Apply**. Changes are a draft until applied; closing the dialog discards selection changes. Owners/editors can apply; viewers can inspect and download the selected font data.

Selections are independent snapshots under `workspace.styles.fonts`:

```json
[
  {
    "id": "catalog-record-id",
    "family": "Inter",
    "href": "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
  }
]
```

The optional field is compatible with older version-1 workspace documents. It participates in commit, undo/redo, browser persistence and revision-aware project saving. Editing/archiving a global entry does not change existing projects. To take a newer catalog version, remove and re-add that entry before applying. Selected records remain visible even if archived or absent from the current catalog page. Up to 100 entries can be selected.

The canvas adds one stylesheet link per unique URL and removes unused links when project selection changes. This happens only inside the preview document, leaving Studio chrome typography untouched. Stylesheet load failures show a localized message; a successfully loaded CSS file does not guarantee its font binaries or family names are valid. The browser/provider still controls those requests.

Loading a family does not automatically change typography. In Style settings, the Fonts group offers project families for the existing Zaux font tokens; the ordinary text inputs retain custom CSS stacks and fallbacks. The generated choice quotes the family and uses sans-serif as an editable fallback. Removing a font does not overwrite authored token values. Replacing/resetting a whole style preset also replaces/removes its font list, consistent with the preset's existing replacement semantics.

## Developer access and exports

- The project's editable workspace JSON and style preset contain the family-to-URL mapping in `styles.fonts`.
- The project font dialog exposes stylesheet links and separate downloads for `fonts.json` (id/family/href) and `fonts.html` (deduplicated stylesheet links).
- Component JavaScript ZIP exports include these two files for all selected project fonts, including native source exports. Add the stylesheet links to the destination document head; the ZIP does not automatically inject them or bundle external font files.
- Component/template-only editable JSON and runtime node snapshots retain their existing envelope contracts; use the separate font downloads when exporting those scopes.
- Token CSS exports remain CSS variables; they do not inline provider CSS.

## Changed files

| File | Change |
| --- | --- |
| `domain/fonts.js` | Font normalization, validation, link output and export files. |
| `domain/styles.js` | Validate optional project font snapshots. |
| `app/services/fonts.js` | Catalog IO, link parsing and preview stylesheet lifecycle. |
| `app/components/builder/BuilderFontLibrary.vue` | Dashboard management and project selection modal. |
| `app/layouts/hub.vue` | Dashboard font-library entry. |
| `app/components/builder/BuilderHeader.vue` | Project font action. |
| `app/components/builder/BuilderStyles.vue` | Project selection and font-token choices. |
| `app/composables/useBuilder.js` | Explicit project font commit. |
| `app/pages/preview.vue` | Load project stylesheets and report load errors. |
| `app/components/builder/BuilderDialog.vue` | Font files in ZIP exports and HTML/JSON highlighting. |
| `app/data/locale/it.json`, `app/data/locale/en.json` | Localized controls and errors. |
| `supabase/migrations/20260914130000_font_library.sql` | Shared catalog, timestamp handling, grants and RLS. |
| `docs/font-library.md` | Setup, workflow, model and export guide. |
| `docs/architecture.md`, `docs/data-format.md`, `README.md` | Feature and data-contract references. |

## Verification status

Source and diffs reviewed only. No tests, browser checks, validators or production builds were run under the standing project instruction. The SQL migration has not been applied remotely. Manual verification remains with the user, including provider CSS/font requests, selection/reload/undo, cross-user permissions, concurrent catalog edits, token application and exported links.
