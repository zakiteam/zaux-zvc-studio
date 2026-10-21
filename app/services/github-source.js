import { zaux as zauxPackage } from '../../package.json';
import { useSupabaseClient } from './supabase.js';

// Read-only GitHub REST client for the PHP conversion: lists the repositories of
// an organization (or user), their branches and files, and reads file contents.
// Only GET requests, in one of two ways:
// - server token (default when configured): /api/github/proxy forwards the
//   request with ZAUX_REPO_BROWSING_GITHUB_TOKEN, which never reaches the
//   browser; the Studio session authenticates the call (`token` null);
// - personal access token typed by the user: straight to api.github.com. It is
//   kept in memory, or in sessionStorage (this tab only) when the user asks,
//   and never stored in a project.

const API = 'https://api.github.com';
const TOKEN_KEY = 'zx_builder_github_token';

// Default owner: the organization of the pinned Zaux release (package.json#zaux.repository).
export const defaultGithubOwner = String(zauxPackage?.repository ?? '').split('/')[0] ?? '';

export class GithubError extends Error {}

const encodePath = path => path.split('/').map(encodeURIComponent).join('/');

async function sessionHeaders() {
  const { data, error } = await useSupabaseClient().auth.getSession();
  if (error || !data.session) throw new GithubError('zx_builder_github_session');
  return { Authorization: 'Bearer ' + data.session.access_token };
}

// Server token: same path and query, forwarded by /api/github/proxy.
async function proxyRequest(path, raw) {
  const [pathname, search = ''] = path.split('?');
  try {
    return await $fetch('/api/github/proxy', {
      headers: await sessionHeaders(),
      query: { ...Object.fromEntries(new URLSearchParams(search)), path: pathname.replace(/^\//, ''), ...(raw ? { raw: '1' } : {}) },
      responseType: raw ? 'text' : 'json'
    });
  } catch (error) {
    if (error instanceof GithubError) throw error;
    const key = error?.data?.statusMessage;
    throw new GithubError(typeof key === 'string' && key.startsWith('zx_builder_github_') ? key : 'zx_builder_github_error');
  }
}

// Whether the server token is configured, for the signed-in Studio user.
export async function githubServerStatus() {
  try {
    const result = await $fetch('/api/github/status', { headers: await sessionHeaders() });
    return result?.configured === true;
  } catch {
    return false;
  }
}

async function request(token, path, { raw = false } = {}) {
  if (!token) return proxyRequest(path, raw);
  let response;
  try {
    response = await fetch(API + path, {
      headers: {
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  } catch {
    throw new GithubError('zx_builder_github_network');
  }
  if (response.status === 401) throw new GithubError('zx_builder_github_unauthorized');
  if ((response.status === 403 || response.status === 429) && response.headers.get('x-ratelimit-remaining') === '0') throw new GithubError('zx_builder_github_rate_limit');
  if (response.status === 403) throw new GithubError('zx_builder_github_forbidden');
  if (response.status === 404) throw new GithubError('zx_builder_github_not_found');
  if (!response.ok) throw new GithubError('zx_builder_github_error');
  return raw ? response.text() : response.json();
}

// Every page of a list endpoint (100 items per page, capped at 10 pages).
async function paginate(token, path) {
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await request(token, `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

// Repositories of an organization, or of a user when the owner is not an organization.
export async function listRepositories(token, owner) {
  const name = encodeURIComponent(owner);
  let repos;
  try { repos = await paginate(token, `/orgs/${name}/repos?type=all&sort=updated`); }
  catch (error) {
    if (error.message !== 'zx_builder_github_not_found') throw error;
    repos = await paginate(token, `/users/${name}/repos?type=all&sort=updated`);
  }
  return repos
    .map(repo => ({ name: repo.name, fullName: repo.full_name, private: !!repo.private, defaultBranch: repo.default_branch, updatedAt: repo.pushed_at ?? repo.updated_at, description: repo.description ?? '' }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function listBranches(token, owner, repo) {
  const branches = await paginate(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`);
  return branches.map(branch => branch.name);
}

// File paths of a branch (recursive tree). `truncated` is set by GitHub for very large repositories.
export async function repositoryFiles(token, owner, repo, ref) {
  const tree = await request(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  return { paths: (tree.tree ?? []).filter(item => item.type === 'blob').map(item => item.path), truncated: !!tree.truncated };
}

export function readRepositoryFile(token, owner, repo, ref, path) {
  return request(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, { raw: true });
}

// Token kept for this tab only, when the user asks for it.
export function storedGithubToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}
export function storeGithubToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable: the token stays in memory */ }
}
