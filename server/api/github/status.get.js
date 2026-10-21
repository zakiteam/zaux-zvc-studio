import { defineEventHandler } from 'h3';
import { githubSession, serverGithubToken } from '../../utils/github.js';

// GET /api/github/status: whether the server token is configured (never the token itself).
export default defineEventHandler(async event => {
  await githubSession(event);
  return { configured: !!serverGithubToken(event) };
});
