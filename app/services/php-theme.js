import { ensureWritePermission, isBridgeSupported, readFile, writeFile } from './zaux-bridge.js';
import { themeFiles, themeTargetNotes, themeWritePlan } from '../../domain/php/theme.js';

// Writes PHP export files into a folder of a WordPress theme (normally
// components/base/ of a zaux-wp-project child theme) through the File System
// Access API, with the same layout as the ZIP: the user grants one folder and
// every read/write stays inside it. The handle is kept for this session only
// (never persisted), so later exports can reuse the same folder.

let current = null;

export const canWriteTheme = isBridgeSupported;
export function currentTheme() { return current; }

export async function pickThemeDirectory() {
  current = await window.showDirectoryPicker({ id: 'zaux-wp-theme', mode: 'readwrite' });
  return current;
}

// { name, notes, plan } for the files of an export.
export async function inspectTheme(handle, files) {
  const writable = themeFiles(files);
  const existing = {};
  for (const path of Object.keys(writable)) existing[path] = await readFile(handle, path);
  const isThemeRoot = (await readFile(handle, 'style.css')) !== null;
  return { name: handle.name, notes: themeTargetNotes(handle.name, isThemeRoot, Object.keys(writable)), plan: themeWritePlan(writable, existing) };
}

// Writes the added and changed files of the plan; returns the number written.
export async function writeTheme(handle, files, plan) {
  if (!(await ensureWritePermission(handle))) throw new Error('zx_builder_php_theme_permission');
  const paths = plan.entries.filter(entry => entry.status !== 'unchanged').map(entry => entry.path);
  for (const path of paths) await writeFile(handle, path, files[path]);
  return paths.length;
}
