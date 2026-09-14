# Media library

Studio keeps image files on the Nuxt host and the authenticated catalog in Supabase. Files are **public**, including files uploaded to a private project. Anyone with an image URL can retrieve it without signing in.

## Setup on Plesk

1. Apply `supabase/migrations/20260914120000_media_assets.sql` in the Supabase SQL Editor after the existing project migrations.
2. Run Nuxt as a persistent Node application. Use a Node version supported by the installed Nuxt and Sharp packages (the project pins Node 24.14.0 for its npm scripts). Install dependencies for the actual deployment OS, including Sharp's optional native packages; do not copy Windows `node_modules` to Linux.
3. Create a directory owned/writable by the Node application user, outside the application/release directories. The provisionally selected path is `/var/www/vhosts/zaki.it/zaux-studio-media`. Never store uploads under `.output`, `public`, `vendor/zaux`, or a folder replaced during deployment.
4. Set these runtime environment variables in Plesk alongside the existing public Supabase configuration:

   ```text
   NUXT_MEDIA_STORAGE_DIR=/var/www/vhosts/zaki.it/zaux-studio-media
   NUXT_MEDIA_PUBLIC_BASE_URL=https://zaux-studio.zaki.it/media
   ```

The production domain is zaux-studio.zaki.it. The user approved assuming the subscription root is /var/www/vhosts/zaki.it; this has not been verified on the server. The media directory is outside the presumed application directory /var/www/vhosts/zaki.it/zaux-studio.zaki.it. If the real subscription root differs, update NUXT_MEDIA_STORAGE_DIR before uploading files. Set both variables in the Plesk Node.js environment: the built server does not automatically load the local .env file.

5. Restart the Node application after changing runtime configuration. The built-in Nuxt route serves `/media/<uuid>.webp` and `/media/<uuid>-thumb.webp`; no nginx alias is required. Ensure Plesk forwards this path to Node instead of returning a static 404. If using a separate static media domain, map that domain to the same persistent directory and set the public base URL accordingly.
6. Allow upload request bodies of at least 10 MiB through the Plesk proxy (for example, `client_max_body_size 11m;` when nginx configuration is available). Nuxt independently limits the actual streamed input to 10 MiB, including chunked requests. The upload endpoint accepts the raw file body, not multipart data.

For local development, set the storage variable to a separate absolute directory such as `C:/xampp/media/zaux-studio` and the URL to `http://127.0.0.1:3000/media`. Localhost URLs are for local use only; exported documents keep their URLs. Configure the production URL before authoring production assets.

No service-role key is required. Each request validates the Supabase user and active profile and uses the user's token for RLS. The publishable key remains the existing application key.

## Access and authoring

- **Project** media belongs to a saved remote project. Members can list it; owners and editors can upload/archive it.
- **Global** media belongs to the signed-in user and can be reused across their projects. This is not an organization-wide shared library. Project collaborators can render referenced public images, but cannot browse another user's global catalog.
- A browser-local workspace can use global media when signed in. Project-scoped uploads require creating/opening a remote project first.
- Project menu → **Media library** opens the catalog; **Project preview** selects or clears the project's cover using project assets.
- Each ZVC library card has a preview action using global assets, including native source definitions. The chosen preview belongs to that definition in the workspace; choosing a new preview does not change existing instance copies.
- Image URL properties on Zimg/img and video posters expose the shared picker. Recognized native content keys and slider paths also expose it; object-valued image configuration remains JSON.
- Manual URL entry remains available. Selecting a file saves a normal absolute URL; it does not introduce runtime media objects or a new export dependency. Bound properties still use their field values.

The database catalog uses opaque UUID file keys and stores the original filename, dimensions and stored bytes (image plus thumbnail). Uploads accept static JPEG, PNG and WebP, up to 10 MiB, 40 million pixels and 12000 pixels per side. Sharp decodes and re-encodes a WebP at quality 90, applies EXIF orientation and strips the original metadata; the original upload is not retained. A separate thumbnail fits inside 320 × 240 pixels. See [Sharp input limits](https://sharp.pixelplumbing.com/api-constructor/) and [output options](https://sharp.pixelplumbing.com/api-output/).

## Persistence and lifecycle

Optional version-1 JSON fields `workspace.coverImage` and `definition.previewImage` store preview URLs. They go through the existing commit, validation, undo/redo, local cache and revision-aware remote save. Native-library refresh preserves the preview metadata without changing the underlying source. Hub listing selects only the cover field from the document, not the complete workspace.

Archiving only hides an asset from the picker. Existing URLs continue working, including revisions, independent copies and exports. There is deliberately no physical-delete endpoint. Deleting a project removes its catalog rows via the foreign key but preserves its files; these may still be referenced elsewhere. Uploads are independent of document undo: undoing image selection does not undo the upload.

Files and database changes are not a distributed transaction. Failed catalog insertion triggers best-effort file cleanup; a server crash can leave orphan files. Back up the media directory and Supabase catalog together. Monitor disk space; archived files and deleted-project files still consume hosting storage. Physical cleanup requires a separate retention policy that accounts for external exports.

The filesystem backend assumes one persistent/shared storage volume. Multiple Node instances on different disks require shared storage. Keep the public origin stable: exports reference remote URLs and do not bundle image files.

## Verification status

Implementation was reviewed in source only. No automated tests, browser checks, validators or production builds were run, following the project instruction. The migration and Plesk configuration have not been applied remotely.

Manual verification remains with the user: upload/selection for all three entry points, native ZVC preview after reload, viewer restrictions, global catalog isolation between users, project save conflicts, undo/redo, archive behavior, export URLs, and image availability after a Plesk redeploy.

## Changed files

| File | Change |
| --- | --- |
| `app/components/builder/BuilderMediaPicker.vue` | Shared native dialog, catalog, uploads, search, paging, URL selection and archiving. |
| `app/components/builder/fields/BuilderImageInput.vue` | Manual URL input with media selection. |
| `app/components/builder/BuilderHeader.vue` | Project media and cover actions. |
| `app/components/builder/BuilderSidebar.vue` | ZVC preview display and selection. |
| `app/components/builder/fields/BuilderProperty.vue` | Image descriptor forwarding. |
| `app/components/builder/fields/BuilderValue.vue` | Shared image field rendering. |
| `app/components/builder/fields/slides/BuilderSliderFields.vue` | Image picker for slide paths. |
| `app/components/builder/inspector/BuilderInspectorDataTab.vue` | Image picker for recognized content fields. |
| `app/composables/useBuilder.js` | Explicit cover and library preview mutations through commit. |
| `app/services/media.js` | Authenticated browser requests. |
| `app/services/projects.js` | Select project covers without loading complete documents. |
| `app/services/source-zvc.js` | Preserve native library preview metadata. |
| `app/pages/index.vue` | Display project covers in the hub. |
| `app/data/locale/it.json` | Italian media labels and errors. |
| `app/data/locale/en.json` | English media labels and errors. |
| `domain/media.js` | Recognize scalar image URL fields. |
| `domain/validation.js` | Validate optional preview strings. |
| `integrations/zaux/property-descriptors.js` | Mark supported image properties in the project adapter. |
| `server/utils/media.js` | Session checks, scope permissions, paths and stream size limits. |
| `server/api/media/index.get.js` | Paginated authorized catalog. |
| `server/api/media/index.post.js` | Decode, normalize, save and register uploads; clean up failed writes. |
| `server/api/media/[id].patch.js` | Archive through RLS. |
| `server/routes/media/[file].get.js` | Public immutable image delivery. |
| `supabase/migrations/20260914120000_media_assets.sql` | Catalog schema, indexes, grants and RLS policies. |
| `nuxt.config.js` | Private media runtime configuration. |
| `.env.example` | Persistent directory and public URL configuration examples. |
| `package.json` | Sharp dependency. |
| `package-lock.json` | Sharp and platform dependency lock entries. |
| `README.md` | Media feature and setup link. |
| `docs/architecture.md` | Responsibilities of the media integration. |
| `docs/data-format.md` | Optional preview fields and URL export behavior. |
| `docs/media-library.md` | Setup, access, retention, limitations and changed-file map. |
