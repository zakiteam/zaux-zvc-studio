// Browser File System Access API bridge. No server and no arbitrary paths: the
// user grants a single directory and every read/write stays inside that handle.

import { mergePreviewHead } from '../../domain/zaux-bridge.js';

export function isBridgeSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function ensureWritePermission(handle) {
  try {
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    return (await handle.requestPermission(options)) === 'granted';
  } catch {
    return true; // Best effort; a real failure surfaces on the first write.
  }
}

function splitPath(path) {
  return String(path).split('/').map(segment => segment.trim()).filter(Boolean);
}

async function directoryHandle(root, segments) {
  let handle = root;
  for (const segment of segments) handle = await handle.getDirectoryHandle(segment, { create: true });
  return handle;
}

export async function writeFile(root, path, content) {
  const segments = splitPath(path);
  const name = segments.pop();
  const dir = await directoryHandle(root, segments);
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function readFile(root, path) {
  const segments = splitPath(path);
  const name = segments.pop();
  let dir = root;
  for (const segment of segments) {
    try { dir = await dir.getDirectoryHandle(segment); } catch { return null; }
  }
  try {
    const file = await dir.getFileHandle(name);
    return await (await file.getFile()).text();
  } catch { return null; }
}

export async function listDirectory(dir) {
  const entries = [];
  for await (const [name, handle] of dir.entries()) entries.push({ name, kind: handle.kind });
  return entries.sort((a, b) => (a.kind === b.kind
    ? a.name.localeCompare(b.name)
    : a.kind === 'directory' ? -1 : 1));
}

export async function pickProjectDirectory() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  return { handle, name: handle.name };
}

export async function detectProject(root) {
  const raw = await readFile(root, 'package.json');
  let name = '';
  let version = '';
  let coreVersion = '';
  if (raw != null) {
    try {
      const json = JSON.parse(raw);
      name = String(json.name ?? '');
      version = String(json.version ?? '');
      coreVersion = String(json.coreVersion ?? json.version ?? '');
    } catch { /* Keep defaults; treated as not a Zaux project. */ }
  }
  let hasProjectDir = false;
  try { await root.getDirectoryHandle('project'); hasProjectDir = true; } catch { /* Missing. */ }
  return { name, version, coreVersion, valid: Boolean(coreVersion) && hasProjectDir };
}

export async function exportToProject(root, projectFiles, fontLinks) {
  if (!(await ensureWritePermission(root))) throw new Error('zx_builder_bridge_permission');
  for (const [path, content] of Object.entries(projectFiles)) {
    await writeFile(root, path, content);
  }
  if (fontLinks) {
    const existing = await readFile(root, '.storybook/preview-head.html');
    await writeFile(root, '.storybook/preview-head.html', mergePreviewHead(existing, fontLinks));
  }
}
