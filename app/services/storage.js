import { parseJson, validateWorkspace } from '../../domain/validation.js';
export const STORAGE_KEY = 'zx_builder_workspace_v1';
export function loadWorkspace(key = STORAGE_KEY) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    return { data: raw ? validateWorkspace(parseJson(raw)) : null, error: null, raw };
  } catch (error) { return { data: null, error, raw }; }
}
export function saveWorkspace(workspace, key = STORAGE_KEY) {
  localStorage.setItem(key, JSON.stringify(workspace));
}
