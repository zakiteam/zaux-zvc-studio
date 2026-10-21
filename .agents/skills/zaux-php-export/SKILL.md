---
name: zaux-php-export
description: Change or extend the PHP export and the hub PHP conversion of Zaux Studio (domain/php, app/services/php-converter.js, app/pages/php-converter.vue) so the generated ZVC/ZVP PHP matches the zaux-wp-core WordPress theme structure.
---

# Zaux PHP export

Read `docs/php-export.md` first. The PHP is written for WordPress themes based on **zaux-wp-core** (parent) and its child themes (**zaux-wp-project**), on the user machine under `C:\Users\Carlo\Local Sites\zaux-wp-theme\app\public\wp-content\themes\`. Those themes are read-only references: inspect them, never edit them from this project.

Invariants:
- Take the theme for granted, never invent PHP helpers: functions `ZVC{Name}($data = [], $params = [])` / `ZVP{Name}(...)`, `ZauxComponentsHelper::getMeta/getDefaults/getValue/renderNode/printComponentsList`, `$gv` closure, `array_merge` of defaults, `defined("ABSPATH") || exit;` first, `__()` with text domain `zaux`, no `require` (the theme autoloads components).
- Export layout (user choice, same for ZIP and file system writes): `{name}/` per ZVC at the root (theme `components/base/`), `_partials/{name}/` (theme `components/_partials/`), `page-templates/{name}.php` (theme root); inside a folder `{Name}.zvc.php`, `{Name}.meta.php`, `data/{Name}.defaults.php`. Folder = lowercase file name; names unique across ZVC and ZVP. No `components/base/` wrapper.
- ACF bridge `{Name}.acf.php` (ZVC only, included unless `options.acf === false`): sub fields named like the `$data` keys, `map` closure, type mapping in `profile.acf.fields`. Build export options with `phpExportOptions()` (`app/services/php-export.js`, ZButton themes from the Zaux release); `domain/php` never imports Zaux aliases.
- One generation pipeline for every source: library visual ZVCs, native Studio/Zaux sources and `components/virtual` folders (ZIP or file system) all go through `phpModel` (+ `nativeBoundNodes`) and the profile templates. Uploaded modules enter the source registry only through `withSourceModules` during the conversion and are never persisted.
- Change the output shape in `domain/php/profile.js` (bump `version` when the contract changes); keep `emit.js`, `printer.js`, `index.js` free of layout choices.
- Literals stay literal (false, 0, '', null); strings always quoted; only emitter-made `PhpCall`/`PhpCode` produce code.
- Browser IO (ZIP, folder or GitHub repository reading through `virtualSources`, blob module loading) stays in `app/services/php-converter.js`; folders are opened read-only; GitHub access (`app/services/github-source.js`) is GET-only: by default through `/api/github/proxy` with the server-only `ZAUX_REPO_BROWSING_GITHUB_TOKEN` (`server/utils/github.js`, endpoint whitelist, Supabase session check), otherwise with a user-typed PAT kept in memory or, on request, sessionStorage — never send the server token to the browser, never use the build `ZAUX_GITHUB_TOKEN`
- Writing into a theme folder goes through `BuilderPhpThemeWrite.vue` + `app/services/php-theme.js` (granted folder only, session handle, confirmation with the write plan of `domain/php/theme.js`); never write `README.md` into the theme and never delete files there; UI strings in `it.json` and `en.json` (`zx_builder_php_*`).

When the theme contract changes (new helper, renamed group, ACF bridge format), re-read the theme `AGENTS.md` and `Components.helper.php`, update the profile and `docs/php-export.md` together.

Validation: follow the root `AGENTS.md` (currently no tests or builds; the user verifies in the browser and in WordPress).
