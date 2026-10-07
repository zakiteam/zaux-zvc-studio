import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, cpSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

// Installs the requested Zaux release into vendor/zaux (gitignored).
// Version: ZAUX_VERSION env, else package.json#zaux.version.
// Source: ZAUX_SOURCE_DIR (local checkout, copied as-is), else the cached
// release zip in .cache/zaux, else a download from the private GitHub repo
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
  const version = process.env.ZAUX_VERSION || pkg.zaux?.version;
  if (!repository || !version) throw new Error('Zaux release missing: set package.json#zaux.repository and #zaux.version.');
  // Only releases the builder has been adapted to; ZAUX_ALLOW_UNSUPPORTED=1 while porting a new one.
  const supported = pkg.zaux?.supported ?? [version];
  if (!supported.includes(version) && process.env.ZAUX_ALLOW_UNSUPPORTED !== '1') {
    throw new Error(`Zaux ${version} is not in package.json#zaux.supported (${supported.join(', ')}). Set ZAUX_ALLOW_UNSUPPORTED=1 to try it anyway.`);
  }
  return { repository, version, sourceDir: process.env.ZAUX_SOURCE_DIR || '' };
}

async function download(repository, version) {
  const token = process.env.ZAUX_GITHUB_TOKEN;
  if (!token) throw new Error(`Zaux ${version} is not cached. Set ZAUX_GITHUB_TOKEN (read access to ${repository}) in .env to download it.`);
  const response = await fetch(`https://api.github.com/repos/${repository}/zipball/${encodeURIComponent(version)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'zaux-builder' }
  });
  if (!response.ok) throw new Error(`Zaux ${version} download failed: ${response.status} ${response.statusText}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function releaseZip(repository, version) {
  const cached = resolve(cacheDir, `${version.replace(/[^\w.-]/g, '_')}.zip`);
  if (existsSync(cached)) return readFileSync(cached);
  const buffer = await download(repository, version);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cached, buffer);
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

export async function installZaux() {
  const { repository, version, sourceDir } = settings();
  const wanted = sourceDir ? { version: 'local', source: resolve(root, sourceDir) } : { version, repository };
  const current = readMarker();
  // Installs made before caseVariants was recorded are refreshed once from the cache.
  if (!sourceDir && current?.version === version && current?.repository === repository && Array.isArray(current.caseVariants)) return current;

  const staging = `${target}.staging`;
  await removeWithRetry(staging);
  mkdirSync(staging, { recursive: true });
  try {
    let caseVariants = [];
    if (sourceDir) {
      cpSync(wanted.source, staging, { recursive: true, filter: path => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.slice(wanted.source.length)) });
    } else {
      caseVariants = await extract(await releaseZip(repository, version), staging);
    }
    if (!existsSync(resolve(staging, 'core/setup.js'))) throw new Error(`Zaux ${wanted.version} does not look like a Zaux release (core/setup.js missing).`);
    writeFileSync(resolve(staging, '.zaux-release.json'), JSON.stringify({ ...wanted, caseVariants, installedAt: new Date().toISOString() }, null, 2) + '\n');
    await replaceTarget(staging);
  } catch (error) {
    await removeWithRetry(staging);
    throw error;
  }
  console.log(`Zaux ${wanted.version} installed in vendor/zaux.`);
  return readMarker();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await installZaux();
