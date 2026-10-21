// Writing a PHP export into a folder of a WordPress theme: target notes and
// the write plan. Pure functions; the file system IO is in app/services/php-theme.js.
// The export layout is written as it is (same as the ZIP): {name}/ per ZVC,
// _partials/{name}/ and page-templates/. The intended target is the
// components/base/ folder of a zaux-wp-core child theme (e.g. zaux-wp-project).

// Notes about the chosen folder, as [{ key, level: 'warning' | 'info' }]:
// a theme root (style.css) or a folder other than base/ is likely a mistake;
// partials and page templates have to be moved to their theme folders.
export function themeTargetNotes(folder, isThemeRoot, paths) {
  const notes = [];
  if (isThemeRoot) notes.push({ key: 'theme_root', level: 'warning' });
  else if (String(folder).toLowerCase() !== 'base') notes.push({ key: 'not_base', level: 'warning' });
  if (paths.some(path => path.startsWith('_partials/'))) notes.push({ key: 'partials', level: 'info' });
  if (paths.some(path => path.startsWith('page-templates/'))) notes.push({ key: 'pages', level: 'info' });
  return notes;
}

// Files that go into the theme: the export README stays out, it would replace a README in the folder.
export function themeFiles(files) {
  return Object.fromEntries(Object.entries(files ?? {}).filter(([path]) => path !== 'README.md'));
}

// existing: { path: current text | null }. Unchanged files are not written again.
export function themeWritePlan(files, existing) {
  const entries = Object.keys(themeFiles(files)).sort().map(path => ({
    path,
    status: existing[path] === null || existing[path] === undefined ? 'added' : existing[path] === files[path] ? 'unchanged' : 'changed'
  }));
  const count = status => entries.filter(entry => entry.status === status).length;
  return { entries, added: count('added'), changed: count('changed'), unchanged: count('unchanged') };
}
