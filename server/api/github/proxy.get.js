import { defineEventHandler, getQuery, setHeader } from 'h3';
import { allowedGithubPath, githubError, githubRequest, githubSession, serverGithubToken } from '../../utils/github.js';

// GET /api/github/proxy?path=<GitHub API path>&raw=1&<query>: read-only GitHub
// request with the server token, for active Studio users only.
export default defineEventHandler(async event => {
  await githubSession(event);
  const token = serverGithubToken(event);
  if (!token) throw githubError(503, 'server_token');
  const query = getQuery(event);
  if (!allowedGithubPath(query.path)) throw githubError(400);
  const raw = query.raw === '1';
  const result = await githubRequest(token, query.path, query, raw);
  if (raw) setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return result;
});
