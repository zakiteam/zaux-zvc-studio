# Library thumbnails

ZVC and ZVP library cards use the same automatic capture path. A manually selected
`definition.previewImage` always takes precedence. Use the existing media picker
to remove that image and return to automatic previews.

## Rendering and storage

`BuilderLibraryThumbnail.vue` requests a thumbnail when its card approaches the
visible scroll area. Requests are debounced by 800 ms. A single temporary iframe
renders one definition at a time through `/preview`, including native source
definitions, captured partials, default field values, project CSS, compiled
Tailwind utilities, tokens, component themes, fonts and language. It does not
change the selected component, template, editor viewport or undo history.

The capture viewport is 1200 x 800 CSS pixels. The image covers the first 900 pixels
of component height at most, with a minimum height of 160 pixels. Output is a
480-pixel-wide JPEG displayed with `object-contain` in the card. Animations are
disabled during capture; images are explicitly loaded even in the offscreen
iframe, which is invisible but inside the viewport so intersection-driven content
can initialize. Videos use their poster to avoid unloaded/tainted canvas capture.
Font/image waits and frame lifetime are bounded. Rendering failures show
a retry message; a failed refresh retains the previous image.

Automatic images are derived browser data, not workspace metadata. IndexedDB
stores one image per workspace/definition. Existing images are reused regardless
of subsequent changes to content, styles or language: regeneration is exclusively
manual. The first automatic attempt is remembered, including failures, so opening
the library does not repeatedly retry failed captures. There is no application
LRU eviction that would silently trigger another generation. Browser storage
clearing/eviction or denied storage can still remove/prevent this cache.

Cache reads bypass the capture queue. Images are never copied into template
instances, workspace JSON, remote saves or generated code. Other browsers keep
their own cache. Storage failure falls back to session-only state.

The **Thumbnails** section of the header project dropdown applies to the entire workspace library, across
ZVC/ZVP tabs, categories and search filters. **Generate missing / retry failed**
keeps existing images and retries failures. **Refresh all** explicitly captures
all definitions without a manual image. Progress and per-definition failure
details are displayed inside the same project dropdown. Uploaded preview images retain precedence.

## Reusable builder API

```js
const builder = useBuilder();
await builder.ensureLibraryThumbnail(definitionId); // Reuse cache when current.
const url = await builder.refreshLibraryThumbnail(definitionId); // Force capture.
await builder.refreshLibraryThumbnails({ missingOnly: true }); // Fill/retry.
await builder.refreshLibraryThumbnails(); // Force all automatic thumbnails.
```

Both methods resolve to a JPEG data URL, or `null` on failure/unavailable context.
They work for any library ZVC/ZVP without selecting it, including read-only project
viewers because only local derived data changes. Automatic requests share pending work. An explicit refresh waits for pending
work and then captures again. A refresh does not overwrite a manual
image; the card exposes **Refresh** when automatic previews are active.

`libraryThumbnails.value[id]` exposes `url`, `status` (`loading`, `ready`, `error`)
and the serialized `source`, plus `error` on failure. `libraryThumbnailSource(id)`
returns current render inputs; changes do not invalidate a cached image.
`thumbnailBatch` exposes running/done/total/failed counters. Retry is manual.

## Capture limits and ownership

This uses [html-to-image](https://github.com/bubkoo/html-to-image) in the browser,
not a server screenshot service. External images/fonts need compatible CORS
responses. Video, embedded content, tainted canvases, offscreen-triggered motion,
teleported overlays and components that need interaction or asynchronous API data
may produce an incomplete preview or a capture error. Manual images remain the
fallback. Changes to upstream implementation/assets at the same URL may require
Refresh. Asset URLs are preserved, including signed query strings.

- `domain/library-thumbnail.js`: JSON render state excluding manual preview metadata.
- `app/services/library-thumbnails.js`: serial queue, iframe protocol and IndexedDB.
- `app/services/capture-thumbnail.js`: capture inside the preview document.
- `app/pages/preview.vue`: request-correlated capture response after rendering.
- `app/composables/useBuilder.js`: reactive state, deduplication and reusable actions.
- `BuilderLibraryThumbnail.vue` / `BuilderSidebar.vue`: first-attempt visibility scheduling and card controls.
- `BuilderHeader.vue`: central thumbnail actions in the project dropdown.
- `BuilderThumbnailControls.vue`: progress and error details in the project menu header.

Reviewed by source and diff only. No automated tests, browser checks, validators
or builds were run; rendering fidelity and resource behavior need manual browser
verification.

## SVG sprite capture

Before DOM capture, external SVG symbol references are fetched once per sprite
within the capture document, sanitized and embedded in the owning SVG's defs.
The use elements then refer to local symbols through modern href attributes.
This avoids html-to-image treating Zaux's external xlink:href URL as a CSS
selector. No dependency or vendor files are changed. Previously cached failures
remain manual retries: use Project > Thumbnails > Generate missing / retry failed.
