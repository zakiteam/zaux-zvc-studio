import { loadWorkspace, STORAGE_KEY } from './storage.js';
import { parseJson, validateWorkspace } from '../../domain/validation.js';
import { clone } from '../../domain/nodes.js';

export function previewStorageKeys(projectId) {
  return [projectId === 'local' ? STORAGE_KEY : STORAGE_KEY + ':project:' + projectId, 'zx_builder_preview_v1:' + projectId];
}
const PREVIEW_PREFIX = 'zx_builder_preview_v1:';
const revision = workspace => workspace ? workspace.id + ':' + workspace.updatedAt : null;

// Snapshots of other projects are only opening states; drop them when the quota is full.
function removeOtherSnapshots(previewKey) {
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (key?.startsWith(PREVIEW_PREFIX) && key !== previewKey) localStorage.removeItem(key);
  }
}

export function openPreviewPage(workspace, { projectId, templateId, componentId, canvasDark }) {
  const [savedKey, previewKey] = previewStorageKeys(projectId);
  const saved = loadWorkspace(savedKey);
  const serialized = JSON.stringify(workspace);
  // An editor state identical to the save needs no second copy: the preview reads the save.
  if (saved.data && saved.raw === serialized) localStorage.removeItem(previewKey);
  else {
    // Keep recovery-mode and fresh editor snapshots separate from the original save.
    const snapshot = '{"workspace":' + serialized + ',"savedRevision":' + JSON.stringify(revision(saved.data)) + '}';
    localStorage.removeItem(previewKey);
    try { localStorage.setItem(previewKey, snapshot); }
    catch { removeOtherSnapshots(previewKey); localStorage.setItem(previewKey, snapshot); }
  }
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
