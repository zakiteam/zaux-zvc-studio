import { parseJson, validateWorkspace } from '../../domain/validation.js';
export const STORAGE_KEY = 'zx_builder_workspace_v1';
export function loadWorkspace() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? validateWorkspace(parseJson(raw)) : null, error: null, raw };
  } catch (error) { return { data: null, error, raw }; }
}
export function saveWorkspace(workspace) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}
