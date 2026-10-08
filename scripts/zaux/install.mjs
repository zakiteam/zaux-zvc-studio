import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, renameSync, cpSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

// Installs the requested Zaux release into vendor/zaux (gitignored).
// Mode: ZAUX_GITHUB_DOWNLOAD_MODE "tag" (default) or "branch".
// Tag mode: ZAUX_VERSION env, else package.json#zaux.version.
// Branch mode: the latest commit of ZAUX_GITHUB_BRANCH (default main).
// Source: ZAUX_SOURCE_DIR (local checkout, copied as-is), else the cached
// zip in .cache/zaux, else a download from the private GitHub repo
// authenticated with ZAUX_GITHUB_TOKEN.
const root = fileURLToPath(new URL('../../', import.meta.url));
const target = resolve(root, 'vendor/zaux');
const marker = resolve(target, '.zaux-release.json');
const cacheDir = resolve(root, '.cache/zaux');

try { process.loadEnvFile(resolve(root, '.env')); } catch {}

function readMarker() {
  try { return JSON.parse(readFileSync(marker, 'utf8')); } catch { return null; }
}

function settings() {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const repository = process.env.ZAUX_REPOSITORY || pkg.zaux?.repository;
  const sourceDir = process.env.ZAUX_SOURCE_DIR || '';
  const mode = process.env.ZAUX_GITHUB_DOWNLOAD_MODE || 'tag';
  if (mode !== 'tag' && mode !== 'branch') throw new Error(`ZAUX_GITHUB_DOWNLOAD_MODE must be "tag" or "branch" (got "${mode}").`);
  if (!repository) throw new Error('Zaux repository missing: set package.json#zaux.repository.');
  if (mode === 'branch') return { repository, mode, branch: process.env.ZAUX_GITHUB_BRANCH || 'main', sourceDir };
  const version = process.env.ZAUX_VERSION || pkg.zaux?.version;
  if (!version) throw new Error('Zaux release missing: set package.json#zaux.version.');
  // Only releases the builder has been adapted to; ZAUX_ALLOW_UNSUPPORTED=1 while porting a new one.
  const supported = pkg.zaux?.supported ?? [version];
  if (!supported.includes(version) && process.env.ZAUX_ALLOW_UNSUPPORTED !== '1') {
    throw new Error(`Zaux ${version} is not in package.json#zaux.supported (${supported.join(', ')}). Set ZAUX_ALLOW_UNSUPPORTED=1 to try it anyway.`);
  }
  return { repository, mode, version, sourceDir };
}

function githubToken(repository, what) {
  const token = process.env.ZAUX_GITHUB_TOKEN;
  if (!token) throw new Error(`${what}: set ZAUX_GITHUB_TOKEN (read access to ${repository}) in .env.`);
  return token;
}

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return { Authorization: `Bearer ${token}`, Accept: accept, 'User-Agent': 'zaux-builder' };
}

// Latest commit SHA of a branch (the vnd.github.sha media type returns it as plain text).
async function branchHead(repository, branch) {
  const token = githubToken(repository, `Cannot resolve Zaux branch ${branch}`);
  const response = await fetch(`https://api.github.com/repos/${repository}/commits/${encodeURIComponent(branch)}`, {
    headers: githubHeaders(token, 'application/vnd.github.sha')
  });
  if (!response.ok) throw new Error(`Zaux branch ${branch} lookup failed: ${response.status} ${response.statusText}.`);
  const sha = (await response.text()).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Zaux branch ${branch} lookup returned an unexpected response.`);
  return sha;
}

async function download(repository, ref, label) {
  const token = githubToken(repository, `Zaux ${label} is not cached`);
  const response = await fetch(`https://api.github.com/repos/${repository}/zipball/${encodeURIComponent(ref)}`, {
    headers: githubHeaders(token)
  });
  if (!response.ok) throw new Error(`Zaux ${label} download failed: ${response.status} ${response.statusText}.`);
  return Buffer.from(await response.arrayBuffer());
}

const cacheName = value => value.replace(/[^\w.-]/g, '_');

async function cachedZip(repository, ref, label, file) {
  const cached = resolve(cacheDir, file);
  if (existsSync(cached)) return readFileSync(cached);
  const buffer = await download(repository, ref, label);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cached, buffer);
  return buffer;
}

const releaseZip = (repository, version) => cachedZip(repository, version, version, `${cacheName(version)}.zip`);

// Branch archives are cached per commit; older commits of the same branch are dropped.
async function branchZip(repository, branch, commit) {
  const prefix = `branch-${cacheName(branch)}-`;
  const buffer = await cachedZip(repository, commit, `${branch}@${commit.slice(0, 7)}`, `${prefix}${commit}.zip`);
  for (const file of readdirSync(cacheDir)) {
    if (file.startsWith(prefix) && file !== `${prefix}${commit}.zip`) await removeWithRetry(resolve(cacheDir, file));
  }
  return buffer;
}

// Release archives wrap everything in a single top-level folder; strip it.
// Zaux ships some files twice with a case-only difference (ZSection.vue and
// Zsection.vue). A case-insensitive filesystem keeps one of them, so identical
// variants are written once and returned for prepare.mjs to register as aliases.
async function extract(buffer, destination) {
  const zip = await JSZip.loadAsync(buffer);
  const written = new Map();
  const caseVariants = [];
  for (const entry of Object.values(zip.files)) {
    const name = entry.name.split('/').slice(1).join('/');
    if (!name || entry.dir) continue;
    const path = resolve(destination, name);
    if (!path.startsWith(destination)) continue;
    const content = await entry.async('nodebuffer');
    const existing = written.get(name.toLowerCase());
    if (existing && existing.name !== name) {
      if (existing.content.equals(content)) {
        caseVariants.push({ path: name, file: existing.name });
        continue;
      }
      console.warn(`Zaux ships ${name} and ${existing.name} with different content; only one survives on case-insensitive filesystems.`);
    }
    written.set(name.toLowerCase(), { name, content });
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return caseVariants;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Windows briefly locks freshly written files (antivirus, search indexer, a running
// dev server's file watcher). Retry transient lock failures instead of failing
// immediately, so the atomic swap never leaves vendor/zaux missing.
const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY']);
const LOCK_HINT = '\nThe directory is locked by another process (a running dev server, editor or antivirus). Stop "npm run dev", close editors, then run "npm run install:zaux" again.';

async function renameWithRetry(from, to) {
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      renameSync(from, to);
      return;
    } catch (error) {
      if (!RETRYABLE.has(error.code)) throw error;
      lastError = error;
      await sleep(150 * (attempt + 1));
    }
  }
  lastError.message += LOCK_HINT;
  throw lastError;
}

async function removeWithRetry(path) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!RETRYABLE.has(error.code)) throw error;
      await sleep(150 * (attempt + 1));
    }
  }
  // A leftover that could not be removed must not abort the install.
  console.warn(`Could not remove ${path}; it will be retried on the next run.`);
}

async function replaceTarget(staging) {
  if (existsSync(target)) {
    if (existsSync(resolve(target, '.git')) || (!readMarker() && existsSync(resolve(target, 'package.json')))) {
      throw new Error('vendor/zaux is not a managed release (Git checkout or unknown files). Remove it manually first.');
    }
  }
  // Swap through a backup: a running dev server can briefly lock files on Windows,
  // and a failed rename must not leave vendor/zaux missing.
  const backup = `${target}.previous`;
  await removeWithRetry(backup);
  if (existsSync(target)) await renameWithRetry(target, backup);
  try {
    await renameWithRetry(staging, target);
  } catch (error) {
    if (existsSync(backup)) {
      try {
        await renameWithRetry(backup, target);
      } catch (restoreError) {
        error.message += `\nAlso failed to restore the previous release from ${backup} (${restoreError.code}); restore it manually.`;
      }
    }
    throw error;
  }
  await removeWithRetry(backup);
}

// Branch mode resolves the branch head on every run. Offline (or without a token)
// an existing install of the same branch is kept instead of failing the dev server.
async function wantedBranch(repository, branch, current) {
  try {
    const commit = await branchHead(repository, branch);
    return { version: `${branch}@${commit.slice(0, 7)}`, repository, mode: 'branch', branch, commit };
  } catch (error) {
    if (current?.mode !== 'branch' || current.branch !== branch || current.repository !== repository) throw error;
    console.warn(`${error.message}\nKeeping the installed Zaux ${current.version}.`);
    return current;
  }
}

export async function installZaux() {
  const { repository, mode, version, branch, sourceDir } = settings();
  const current = readMarker();
  const wanted = sourceDir
    ? { version: 'local', source: resolve(root, sourceDir) }
    : mode === 'branch' ? await wantedBranch(repository, branch, current) : { version, repository };
  // Installs made before caseVariants was recorded are refreshed once from the cache.
  if (!sourceDir && current?.version === wanted.version && current?.repository === repository && (current.commit ?? null) === (wanted.commit ?? null) && Array.isArray(current.caseVariants)) return current;

  const staging = `${target}.staging`;
  await removeWithRetry(staging);
  mkdirSync(staging, { recursive: true });
  try {
    let caseVariants = [];
    if (sourceDir) {
      cpSync(wanted.source, staging, { recursive: true, filter: path => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.slice(wanted.source.length)) });
    } else {
      const zip = mode === 'branch' ? await branchZip(repository, branch, wanted.commit) : await releaseZip(repository, version);
      caseVariants = await extract(zip, staging);
    }
    if (!existsSync(resolve(staging, 'core/setup.js'))) throw new Error(`Zaux ${wanted.version} does not look like a Zaux release (core/setup.js missing).`);
    const { caseVariants: _previous, installedAt: _installed, ...release } = wanted;
    writeFileSync(resolve(staging, '.zaux-release.json'), JSON.stringify({ ...release, caseVariants, installedAt: new Date().toISOString() }, null, 2) + '\n');
    await replaceTarget(staging);
  } catch (error) {
    await removeWithRetry(staging);
    throw error;
  }
  console.log(`Zaux ${wanted.version} installed in vendor/zaux.`);
  return readMarker();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await installZaux();
