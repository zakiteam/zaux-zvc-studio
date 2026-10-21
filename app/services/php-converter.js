import JSZip from 'jszip';
import { phpSourceExport } from '../../domain/php/sources.js';
import { readRepositoryFile, repositoryFiles } from './github-source.js';

// PHP conversion of the components/virtual folder of a Zaux project, from an
// uploaded ZIP or from a folder of the file system (File System Access API,
// or a folder input where that API is missing). The ZVC/ZVP modules are
// JavaScript: they are loaded in the browser as ES modules (blob URLs), with
// their imports rewritten to the other files of the source or to the Zaux
// modules bundled with the Studio (@zx_core, @zx_project, @zx_style), then
// converted by domain/php/sources.js with the same pipeline as the library
// ZVC/ZVPs. Nothing is persisted or uploaded; folders are only read.
// The code of the source runs in the Studio page: only trusted projects.

// Zaux modules a virtual component may import, loaded on demand.
const hostModules = import.meta.glob([
  '../../vendor/zaux/{core,project}/common/helpers/*.js',
  '../../vendor/zaux/{core,project}/components/**/*.meta.js',
  '../../vendor/zaux/{core,project}/components/virtual/**/*.js',
  '../../vendor/zaux/style/ui.config.js',
  '!../../vendor/zaux/**/*.stories.js',
  '!../../vendor/zaux/**/docs/**'
]);
const HOST_PREFIX = '../../vendor/zaux/';
const ALIASES = { '@zx_core/': 'core/', '@zx_project/': 'project/', '@zx_style/': 'style/' };
const HOST_GLOBAL = '__zauxPhpConverterHost';
const SOURCE_RE = /\.zv[cp]\.js$/;
const IGNORED_RE = /(^|\/)(__MACOSX|node_modules|docs)\/|(^|\/)\.[^/]*$|\.stories\.js$/;
const IGNORED_DIRS = new Set(['__MACOSX', 'node_modules', 'docs', 'dist', 'vendor']);
const TEXT_RE = /\.(m?js|json|css|scss|sass|less)$/;
const STYLE_RE = /\.(css|scss|sass|less)$/;
const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^'"\n]+)\2/g;

export class PhpConversionError extends Error {}

function normalize(parts) {
  const result = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') result.pop(); else result.push(part);
  }
  return result.join('/');
}
const directoryOf = path => path.slice(0, path.lastIndexOf('/') + 1);
const candidates = path => [path, path + '.js', path + '.json', path + '/index.js'];

// Root of the virtual components inside the ZIP: the components/virtual or
// virtual folder when present, else the ZIP root.
function virtualRoot(paths) {
  for (const marker of ['components/virtual/', 'virtual/']) {
    for (const path of paths) {
      if (path.startsWith(marker)) return marker;
      const index = path.indexOf('/' + marker);
      if (index >= 0) return path.slice(0, index + 1 + marker.length);
    }
  }
  return '';
}

// Archive read by the loader: { root, projectRoot, sources, has(path), text(path) }.
// `root` is the virtual folder; `projectRoot` the folder @zx_project/ points
// to inside the source (null when the source holds only the virtual folder);
// `text` may load files on demand (GitHub repositories).
export function archiveFrom(texts, { root = virtualRoot(Object.keys(texts)), projectRoot = null, paths = Object.keys(texts), load = null } = {}) {
  const known = new Set(paths);
  const sources = paths.filter(path => path.startsWith(root) && SOURCE_RE.test(path) && !IGNORED_RE.test(path)).sort();
  if (!sources.length) throw new PhpConversionError('zx_builder_php_convert_empty');
  return {
    root,
    projectRoot,
    sources,
    has: path => known.has(path),
    text: async path => {
      if (!Object.hasOwn(texts, path)) texts[path] = load ? await load(path) : '';
      return texts[path];
    }
  };
}
export const wanted = path => !IGNORED_RE.test(path) && TEXT_RE.test(path);

async function readZip(file) {
  let zip;
  try { zip = await JSZip.loadAsync(file); }
  catch { throw new PhpConversionError('zx_builder_php_convert_zip_invalid'); }
  const texts = {};
  for (const entry of Object.values(zip.files)) {
    const path = entry.name.replace(/\\/g, '/');
    if (!entry.dir && wanted(path)) texts[path] = await entry.async('string');
  }
  return archiveFrom(texts);
}

// Folder of the file system (FileSystemDirectoryHandle). A project root or a
// components folder is narrowed to its components/virtual folder; heavy or
// hidden folders are not visited.
async function readDirectory(handle) {
  async function child(dir, name) {
    try { return await dir.getDirectoryHandle(name); } catch { return null; }
  }
  const components = await child(handle, 'components');
  let start = components ? await child(components, 'virtual') : null;
  if (!start && handle.name === 'components') start = await child(handle, 'virtual');
  start ??= handle;
  const texts = {};
  async function walk(dir, prefix) {
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (!entry.name.startsWith('.') && !IGNORED_DIRS.has(entry.name)) await walk(entry, prefix + entry.name + '/');
      } else if (wanted(prefix + entry.name)) {
        texts[prefix + entry.name] = await (await entry.getFile()).text();
      }
    }
  }
  await walk(start, '');
  return archiveFrom(texts);
}

// Files of a folder input (webkitdirectory): paths relative to the chosen folder.
async function readFileList(files) {
  const texts = {};
  for (const file of files) {
    const path = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    if (wanted(path) && !path.split('/').slice(0, -1).some(part => IGNORED_DIRS.has(part))) texts[path] = await file.text();
  }
  return archiveFrom(texts);
}

// Folder picking through the File System Access API (Chromium, secure context).
export function canPickDirectory() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}
export async function pickVirtualDirectory() {
  return window.showDirectoryPicker({ id: 'zaux-php-virtual', mode: 'read' });
}

// components/virtual folders of a repository file list, project ones first
// (e.g. project/components/virtual/, then core/components/virtual/).
export function virtualRoots(paths) {
  const roots = new Set();
  for (const path of paths) {
    const index = path.indexOf('components/virtual/');
    if (index >= 0 && (index === 0 || path[index - 1] === '/') && SOURCE_RE.test(path) && wanted(path)) roots.add(path.slice(0, index + 'components/virtual/'.length));
  }
  return [...roots].sort((a, b) => Number(!a.startsWith('project/')) - Number(!b.startsWith('project/')) || a.localeCompare(b));
}

// GitHub repository (read only): the virtual folder files are downloaded up
// front, other files (e.g. @zx_project/ metas) when a module imports them.
// @zx_project/ points to the project folder of the repository.
async function readGithub({ token, owner, repo, ref, root }) {
  const { paths } = await repositoryFiles(token, owner, repo, ref);
  const texts = {};
  const load = path => readRepositoryFile(token, owner, repo, ref, path);
  const prefetch = paths.filter(path => path.startsWith(root) && wanted(path));
  // A few requests at a time, to stay friendly with the GitHub API.
  for (let index = 0; index < prefetch.length; index += 8) {
    const batch = prefetch.slice(index, index + 8);
    const contents = await Promise.all(batch.map(load));
    batch.forEach((path, position) => { texts[path] = contents[position]; });
  }
  const projectRoot = root.endsWith('components/virtual/') ? root.slice(0, -'components/virtual/'.length) : null;
  return archiveFrom(texts, { root, projectRoot, paths, load });
}

// Conversion sources: { kind, name, read() }. A folder or a repository is read
// again on every conversion, so a new conversion picks up the latest changes.
export const virtualSources = {
  github: ({ token, owner, repo, ref, root }) => ({ kind: 'github', name: `${owner}/${repo}@${ref}`, read: () => readGithub({ token, owner, repo, ref, root }) }),
  zip: file => ({ kind: 'zip', name: file.name, read: () => readZip(file) }),
  directory: handle => ({ kind: 'directory', name: handle.name, read: () => readDirectory(handle) }),
  files: files => {
    const list = [...files];
    const name = (list[0]?.webkitRelativePath || '').split('/')[0] || 'components';
    return { kind: 'files', name, read: () => readFileList(list) };
  }
};

// ES module loader for the source files. Every file becomes a blob URL module;
// imports that cannot be resolved are left as they are and fail only if the
// module really loads them (the error is reported for that component).
function createLoader(archive) {
  const { root, projectRoot } = archive;
  const urls = new Map();
  const created = [];
  const pending = new Set();
  const host = globalThis[HOST_GLOBAL] = {};
  function blob(code) {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    created.push(url);
    return url;
  }
  async function hostUrl(specifier) {
    const alias = Object.keys(ALIASES).find(prefix => specifier.startsWith(prefix));
    if (!alias) return null;
    const base = HOST_PREFIX + ALIASES[alias] + specifier.slice(alias.length);
    const path = candidates(base).find(item => hostModules[item]);
    if (!path) return null;
    if (urls.has(path)) return urls.get(path);
    const namespace = await hostModules[path]();
    host[path] = namespace;
    const names = Object.keys(namespace).filter(name => name !== 'default' && /^[A-Za-z_$][\w$]*$/.test(name));
    const url = blob(`const __zauxHostModule = globalThis[${JSON.stringify(HOST_GLOBAL)}][${JSON.stringify(path)}];\n`
      + ('default' in namespace ? 'export default __zauxHostModule.default;\n' : '')
      + (names.length ? `export const { ${names.join(', ')} } = __zauxHostModule;\n` : ''));
    urls.set(path, url);
    return url;
  }
  // Files of the source: relative imports, the virtual folder and (when the
  // source holds the whole project) any @zx_project/ path.
  function localPath(specifier, from) {
    let base = null;
    if (specifier.startsWith('./') || specifier.startsWith('../')) base = normalize((directoryOf(from) + specifier).split('/'));
    else if (specifier.startsWith('@zx_project/components/virtual/')) base = normalize((root + specifier.slice('@zx_project/components/virtual/'.length)).split('/'));
    else if (projectRoot !== null && specifier.startsWith('@zx_project/')) base = normalize((projectRoot + specifier.slice('@zx_project/'.length)).split('/'));
    return base === null ? null : candidates(base).find(path => archive.has(path) && (TEXT_RE.test(path) || STYLE_RE.test(path))) ?? null;
  }
  async function resolve(specifier, from) {
    const local = localPath(specifier, from);
    if (local) return moduleUrl(local);
    return hostUrl(specifier);
  }
  async function moduleUrl(path) {
    if (urls.has(path)) return urls.get(path);
    // Import cycles cannot be expressed with blob URLs.
    if (pending.has(path)) return null;
    pending.add(path);
    try {
      let code;
      if (path.endsWith('.json')) code = `export default ${await archive.text(path)};\n`;
      else if (STYLE_RE.test(path)) code = 'export default "";\n';
      else {
        const source = await archive.text(path);
        const specifiers = [...new Set([...source.matchAll(SPECIFIER_RE)].map(match => match[3]))];
        const resolved = new Map();
        for (const specifier of specifiers) {
          const url = await resolve(specifier, path);
          if (url) resolved.set(specifier, url);
        }
        code = source.replace(SPECIFIER_RE, (match, head, quote, specifier) => resolved.has(specifier) ? head + quote + resolved.get(specifier) + quote : match);
      }
      const url = blob(code);
      urls.set(path, url);
      return url;
    } finally { pending.delete(path); }
  }
  async function load(path) {
    const url = await moduleUrl(path);
    if (!url) throw new PhpConversionError('zx_builder_php_convert_cycle');
    return import(/* @vite-ignore */ url);
  }
  function dispose() {
    for (const url of created) URL.revokeObjectURL(url);
    urls.clear();
    delete globalThis[HOST_GLOBAL];
  }
  return { load, dispose };
}

// Converts a source (virtualSources): { files, components, errors, root }.
// Component and error keys are the source paths relative to the virtual folder.
export async function convertVirtualSource(source, options = {}) {
  const archive = await source.read();
  const loader = createLoader(archive);
  const entries = [];
  const errors = [];
  try {
    for (const path of archive.sources) {
      const key = path.slice(archive.root.length);
      try {
        const module = (await loader.load(path)).default;
        if (!module || typeof module.buildNode !== 'function') throw new PhpConversionError('zx_builder_native_invalid');
        const name = key.split('/').at(-1).replace(SOURCE_RE, '');
        const defaultsPath = directoryOf(path) + 'data/' + name + '.defaults.js';
        const defaults = archive.has(defaultsPath) ? (await loader.load(defaultsPath)).default ?? {} : {};
        // Same normalization as the Zaux sources bundled with the Studio (integrations/zaux/source-library.js).
        const normalized = key.endsWith('.zvp.js') ? module : { ...module, ZVCName: module.ZVCName ?? module.meta?.ZVCName ?? 'ZVC' + name };
        entries.push({ key, module: normalized, defaults });
      } catch (error) {
        errors.push({ key, message: error?.message ?? String(error) });
      }
    }
    // ZVCs first, so their names are kept when a ZVP would take the same one.
    entries.sort((a, b) => Number(a.key.endsWith('.zvp.js')) - Number(b.key.endsWith('.zvp.js')) || a.key.localeCompare(b.key));
    const result = phpSourceExport(entries, options);
    return { ...result, root: archive.root, errors: [...errors, ...result.errors] };
  } finally {
    loader.dispose();
  }
}
