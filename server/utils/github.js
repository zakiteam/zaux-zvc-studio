import { createError } from 'h3';
import { useRuntimeConfig } from '#imports';
import { studioSession } from './session.js';

// Read-only GitHub access for the PHP conversion with the server token
// ZAUX_REPO_BROWSING_GITHUB_TOKEN (.env / hosting environment). The token never
// leaves the server: the browser calls /api/github/proxy with its Supabase
// session, and only the GET endpoints below are forwarded.

export function githubError(statusCode, key = 'error') {
  return createError({ statusCode, statusMessage: 'zx_builder_github_' + key });
}

// Active Studio user; session failures get their own keys, so they are not
// confused with GitHub rejecting the token.
export function githubSession(event) {
  return studioSession(event, (statusCode, key) => githubError(statusCode, key === 'unauthorized' ? 'session' : key));
}

// runtimeConfig.repoBrowsingGithubToken (NUXT_REPO_BROWSING_GITHUB_TOKEN) or
// ZAUX_REPO_BROWSING_GITHUB_TOKEN read at request time.
export function serverGithubToken(event) {
  const config = useRuntimeConfig(event);
  return String(config.repoBrowsingGithubToken || process.env.ZAUX_REPO_BROWSING_GITHUB_TOKEN || '').trim();
}

const NAME = '[A-Za-z0-9._-]+';
const ENDPOINTS = [
  new RegExp(`^orgs/${NAME}/repos$`),
  new RegExp(`^users/${NAME}/repos$`),
  new RegExp(`^repos/${NAME}/${NAME}/branches$`),
  new RegExp(`^repos/${NAME}/${NAME}/git/trees/[^/?#]+$`),
  new RegExp(`^repos/${NAME}/${NAME}/contents/[^?#]+$`)
];
export const GITHUB_QUERY_KEYS = ['type', 'sort', 'per_page', 'page', 'recursive', 'ref'];

// `path` keeps its URL encoding (branch names and file paths are encoded per segment).
export function allowedGithubPath(path) {
  if (typeof path !== 'string' || path.length > 1000 || !ENDPOINTS.some(pattern => pattern.test(path))) return false;
  try {
    return path.split('/').every(segment => !['', '.', '..'].includes(decodeURIComponent(segment)));
  } catch {
    return false;
  }
}

export async function githubRequest(token, path, query, raw) {
  const search = new URLSearchParams();
  for (const key of GITHUB_QUERY_KEYS) if (typeof query[key] === 'string' && query[key].length <= 200) search.set(key, query[key]);
  let response;
  try {
    response = await fetch(`https://api.github.com/${path}${search.toString() ? '?' + search : ''}`, {
      headers: {
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'zaux-studio',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  } catch {
    throw githubError(502, 'network');
  }
  if (response.status === 401) throw githubError(502, 'unauthorized');
  if ((response.status === 403 || response.status === 429) && response.headers.get('x-ratelimit-remaining') === '0') throw githubError(429, 'rate_limit');
  if (response.status === 403) throw githubError(403, 'forbidden');
  if (response.status === 404) throw githubError(404, 'not_found');
  if (!response.ok) throw githubError(502, 'error');
  return raw ? response.text() : response.json();
}
