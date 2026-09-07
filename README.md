<p align="center">
  <img src="./app-logo.png" alt="Zaux Studio logo" width="120" />
</p>

<p align="center"><strong>Zaux Studio</strong></p>

<p align="center">
  A visual workspace for building, configuring, and exporting Zaux Virtual Components and Templates.
</p>

<br/>
<br/>

Zaux Studio is a Nuxt 4, JavaScript-only editor for assembling Zaux components visually while preserving a structured, portable workspace document.

## Features

- Build templates from independent ZVC instances and native code-backed components.
- Edit content, properties, bindings, nested elements, and Zaux-compatible style tokens.
- Reorder, nest, duplicate, and remove nodes directly from the editor and preview.
- Export editable JSON workspaces or JavaScript packages for individual ZVCs.
- Keep local browser autosave, recovery, undo/redo, and cross-tab conflict handling.
- Optionally sign in with Supabase and save projects remotely with owner, editor, and viewer permissions.

## Local development

```sh
git submodule update --init --recursive
npm install
npm run dev
```

Open http://127.0.0.1:3000. The project includes a local Node 24 runtime dependency so npm scripts work with the Nuxt version without changing the system installation.

## Remote projects and authentication

Remote persistence is optional. Create a `.env` file from `.env.example` and provide the public Supabase URL and publishable key:

```text
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Run the SQL migrations in `supabase/migrations/` through the Supabase SQL Editor, then enable the intended users in `public.profiles`. See the [Supabase setup guide](docs/supabase.md) for user activation, project roles, and the RLS correction required if project creation returns error `42501`.

Without a configured Supabase instance, workspace data remains in the current browser and origin.

## Using the editor

1. Select a template or create a new one.
2. Insert a copy from the ZVC library; each inserted instance is independent.
3. Drag Zaux or HTML elements onto the preview, or add them from the Elements tab.
4. Select an element to edit its properties, then nest it in a container or place it before or after another element.
5. Create configurable fields and bind element properties to them. The Content tab edits the selected instance values.
6. Export an editable JSON document, or select a ZVC and download its JavaScript package.

## Code-backed ZVCs and palette

Add native modules under `app/zvc/`. The `starterhero/StarterHero.zvc.js` example follows the Zaux structure with metadata, defaults, `gv`, and `buildNode`; native modules are made available in the library without changing existing saved instances.

The drag-and-drop whitelist lives in `app/data/catalog/palette.js`. Read the [code components guide](docs/code-components.md) for configuration, export, and visual-conversion details.

## Commands

- `npm run dev`: prepare the project-owned Zaux bridge and start Nuxt.
- `npm run build`: create a production build.
- `npm run preview`: serve the production build.
- `npm test`: run data and JavaScript export checks.
- `npm run test:browser`: run browser scenarios; requires the dev server and Microsoft Edge.
- `npm run prepare:zaux`: regenerate the bridge outside the read-only submodule.

## Further reading

- [Architecture](docs/architecture.md)
- [Data format and exports](docs/data-format.md)
- [Supabase setup](docs/supabase.md)
- [AI knowledge index](docs/ai/INDEX.md)

`vendor/zaux` is pinned to a Git revision and treated as read-only. Project integrations and generated bridge files live outside the submodule.