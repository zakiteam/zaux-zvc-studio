import { loadWorkspace, STORAGE_KEY } from './storage.js';
import { parseJson, validateWorkspace } from '../../domain/validation.js';
import { clone } from '../../domain/nodes.js';

export function previewStorageKeys(projectId) {
  return [projectId === 'local' ? STORAGE_KEY : STORAGE_KEY + ':project:' + projectId, 'zx_builder_preview_v1:' + projectId];
}
const revision = workspace => workspace ? workspace.id + ':' + workspace.updatedAt : null;

export function openPreviewPage(workspace, { projectId, templateId, componentId, canvasDark }) {
  const [savedKey, previewKey] = previewStorageKeys(projectId);
  // Keep recovery-mode and fresh editor snapshots separate from the original save.
  localStorage.setItem(previewKey, JSON.stringify({ workspace, savedRevision: revision(loadWorkspace(savedKey).data) }));
  const query = new URLSearchParams(componentId ? { component: componentId } : { template: templateId });
  if (canvasDark) query.set('canvas', 'dark');
  window.open('/view/' + encodeURIComponent(projectId) + '?' + query, '_blank', 'noopener');
}

export function readPreviewWorkspace(projectId, remoteDocument = null) {
  const [savedKey, previewKey] = previewStorageKeys(projectId);
  const saved = loadWorkspace(savedKey).data;
  let snapshot = null;
  try {
    const raw = localStorage.getItem(previewKey);
    if (raw) { snapshot = parseJson(raw); validateWorkspace(snapshot.workspace); }
  } catch { snapshot = null; }
  // A changed save supersedes the opening snapshot, including undo/redo, whose
  // timestamps can go backwards. Source-only changes at opening remain visible.
  const workspace = snapshot && (!saved || snapshot.savedRevision === revision(saved))
    ? snapshot.workspace : saved ?? remoteDocument;
  if (!workspace) throw new Error('zx_builder_preview_unavailable');
  return validateWorkspace(clone(workspace));
}
