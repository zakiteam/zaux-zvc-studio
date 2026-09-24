import { snapshotNode, materializeNode } from '../../domain/node-clipboard.js';
import { libraryThumbnailState } from '../../domain/library-thumbnail.js';
import { createLibraryThumbnailRenderer } from '../services/library-thumbnails.js';
import { openPreviewPage as openPreviewWindow } from '../services/preview-page.js';
import { partialDefinitions, partialLibraryDefinition as findPartialLibraryDefinition, restorePartialReference as restorePartial } from '../../domain/partials.js';
import { parseThemeCss } from '../../domain/component-themes.js';
import { projectFonts } from '../../domain/fonts.js';
import { restoreInstance } from '../../domain/restore-instance.js';
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { createWorkspace, createDefinition, copyDefinition, createInstance, createTemplate, exportName } from '../../domain/workspace.js';
import { ancestorIds, clone, uid, createNode, dataFor, findNode, locateNode, copyNode, insertNode, moveNode, wrapNode as wrapTreeNode } from '../../domain/nodes.js';
import { validateWorkspace, validateDefinition, parseJson } from '../../domain/validation.js';
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from '../services/storage.js';
import { catalogNode, containers } from '../services/catalog.js';
import { descendingStyles } from '../../integrations/zaux/responsive-styles.js';
import { viewports, simpleViewports, previewWidth, styleScopeForWidth } from '../../integrations/zaux/viewports.js';
import { mergeSourceLibrary, refreshSourceSnapshots, visualSourceCopy, sourceAvailable } from '../services/source-zvc.js';
import { setStyleVariable, setUIValue, validateStylePreset } from '../../domain/styles.js';
import { createStyleBridge } from '../services/styles.js';
import stylePreset from '../data/styles/preset.js';
import { useTranslation } from './useTranslation.js';
import { listRemoteProjects, getRemoteProject, createRemoteProject as createRemoteProjectRecord, saveRemoteProject, renameRemoteProject as renameRemoteProjectRecord, deleteRemoteProject as deleteRemoteProjectRecord } from '../services/projects.js';
import { useAuth } from './useAuth.js';

const key = Symbol('zaux-builder');
export function useBuilder() { return inject(key); }
export function createBuilder({ projectId = null } = {}) {
  const storageKey = projectId ? STORAGE_KEY + ':project:' + projectId : STORAGE_KEY;
  const workspaceReady = ref(false);
  let disposed = false;
  const i18n = useTranslation();
  const document = ref(createWorkspace());
  const libraryThumbnails = ref(Object.create(null));
  const thumbnailRenderer = createLibraryThumbnailRenderer();
  const thumbnailRequests = new Map();
  function libraryThumbnailSource(id) {
    const definition = document.value.library.find(item => item.id === id);
    return definition ? JSON.stringify(libraryThumbnailState(definition, document.value, i18n.language.value)) : '';
  }
  function requestLibraryThumbnail(id, force) {
    const source = libraryThumbnailSource(id);
    if (!source || disposed || !workspaceReady.value) return Promise.resolve(null);
    const workspaceId = document.value.id;
    const key = JSON.stringify([workspaceId, id]);
    const current = libraryThumbnails.value[id];
    if (current) {
      if (current.status === 'loading') return thumbnailRequests.get(key) ?? Promise.resolve(null);
      if (!force) return Promise.resolve(current.url || null);
    }
    const entry = { source, url: current?.url ?? '', status: 'loading' };
    libraryThumbnails.value[id] = entry;
    const isCurrent = () => !disposed && document.value.id === workspaceId && libraryThumbnails.value[id]?.source === source
      && thumbnailRequests.get(key) === task && document.value.library.some(item => item.id === id);
    const task = thumbnailRenderer.render(key, JSON.parse(source), { force, isCurrent }).then(url => {
      if (isCurrent()) libraryThumbnails.value[id] = { ...entry, url, status: 'ready' };
      return url;
    }).catch(exception => {
      if (isCurrent()) libraryThumbnails.value[id] = { ...entry, url: exception.thumbnailUrl || entry.url, status: 'error', error: exception.message || 'Thumbnail capture failed' };
      return null;
    }).finally(() => {
      if (thumbnailRequests.get(key) !== task) return;
      thumbnailRequests.delete(key);
      // A superseded capture must not leave a permanent loading state after undo.
      if (document.value.id === workspaceId && libraryThumbnails.value[id]?.source === source && libraryThumbnails.value[id]?.status === 'loading') delete libraryThumbnails.value[id];
    });
    thumbnailRequests.set(key, task);
    return task;
  }
  function ensureLibraryThumbnail(id) { return requestLibraryThumbnail(id, false); }
  async function refreshLibraryThumbnail(id) {
    const workspaceId = document.value.id;
    const pending = thumbnailRequests.get(JSON.stringify([workspaceId, id]));
    if (pending) await pending;
    if (disposed || document.value.id !== workspaceId) return null;
    return requestLibraryThumbnail(id, true);
  }
  const thumbnailBatch = ref({ running: false, done: 0, total: 0, failed: 0 });
  async function refreshLibraryThumbnails({ missingOnly = false } = {}) {
    if (thumbnailBatch.value.running || !workspaceReady.value) return;
    const workspaceId = document.value.id;
    const ids = document.value.library.filter(item => !item.previewImage).map(item => item.id);
    const progress = { running: true, done: 0, total: ids.length, failed: 0 };
    thumbnailBatch.value = progress;
    try {
      for (const id of ids) {
        if (disposed || document.value.id !== workspaceId) break;
        // A user refresh follows any pending automatic capture instead of sharing it.
        const pending = thumbnailRequests.get(JSON.stringify([workspaceId, id]));
        if (pending) await pending;
        if (disposed || document.value.id !== workspaceId) break;
        const force = !missingOnly || libraryThumbnails.value[id]?.status === 'error';
        let result = await requestLibraryThumbnail(id, force);
        if (!result && !force && !disposed && document.value.id === workspaceId) result = await requestLibraryThumbnail(id, true);
        progress.done++;
        if (!result) progress.failed++;
        thumbnailBatch.value = { ...progress };
      }
    } finally { thumbnailBatch.value = { ...progress, running: false }; }
  }
  watch(() => document.value.id, () => { libraryThumbnails.value = Object.create(null); });
  const mode = ref('template');
  const templatesOpen = ref(false);
  const templateId = ref(document.value.templates[0].id);
  const libraryId = ref(document.value.library[0]?.id);
  const instanceId = ref(document.value.templates[0].instances[0]?.id);
  const nodeId = ref(null);
  const collapsedOutline = ref(new Set());
  function toggleOutline(key) {
    if (collapsedOutline.value.has(key)) collapsedOutline.value.delete(key);
    else collapsedOutline.value.add(key);
  }
  const revealTarget = ref(null);
  function reveal(instanceId, nodeId = null) {
    revealTarget.value = { instanceId, nodeId };
  }
  const revealOutlineTarget = ref(null);
  function revealOutline(instanceId, nodeId = null) {
    const next = new Set(collapsedOutline.value);
    if (mode.value === 'library') {
      if (activeDefinition.value) next.delete('definition:' + activeDefinition.value.id);
      if (nodeId && activeDefinition.value) for (const id of ancestorIds(activeDefinition.value.tree, nodeId) ?? []) next.delete('node:library:' + id);
    } else if (instanceId) {
      next.delete('instance:' + instanceId);
      const instance = activeTemplate.value?.instances.find((item) => item.id === instanceId);
      if (nodeId && instance) for (const id of ancestorIds(instance.definition.tree, nodeId) ?? []) next.delete('node:' + instanceId + ':' + id);
    }
    collapsedOutline.value = next;
    revealOutlineTarget.value = { instanceId, nodeId };
  }
  const leftTab = ref('library');
  const libraryCategory = ref('imported');
  const librarySearch = ref('');
  const libraryKind = ref('zvc');
  const inspectorTab = ref('properties');
  const viewportMode = ref('simple');
  const simpleViewport = ref('auto');
  const viewport = ref('auto');
  const followViewportStyles = ref(true);
  const nominalViewportWidth = computed(() => viewportMode.value === 'simple'
    ? (simpleViewports.find(item => item.value === simpleViewport.value)?.width ?? null)
    : viewports.find(item => item.name === viewport.value)?.width ?? null);
  const viewportWidth = computed(() => previewWidth(nominalViewportWidth.value));
  const viewportStyleScope = computed(() => styleScopeForWidth(viewportWidth.value));
  const viewportLabel = computed(() => nominalViewportWidth.value === null
    ? i18n.translate('zx_builder_viewport_auto')
    : `${viewportMode.value === 'simple' ? i18n.translate(`zx_builder_${simpleViewport.value}`) : viewport.value} - ${nominalViewportWidth.value} PX`);
  const simpleViewportOptions = computed(() => simpleViewports.map(item => ({
    value: item.value,
    label: i18n.translate(item.label) + (item.minWidth === undefined ? '' : descendingStyles ? ' (' + item.width + ' px)' : ' (≥ ' + item.minWidth + ' px)')
  })));
  const viewportOptions = computed(() => [
    { value: 'auto', label: i18n.translate('zx_builder_viewport_auto') },
    ...viewports.map(item => ({ value: item.name, label: `${item.name} (${item.width} px)` }))
  ]);
  const previewOnly = ref(false);
  const previewHeaderHidden = ref(false);
  const canvasDark = ref(false);
  function updateBodyBackground(value) {
    commit(workspace => {
      if (value) workspace.styles.bodyBackground = value;
      else delete workspace.styles.bodyBackground;
    });
  }
  function openPreviewPage() {
    try {
      flushSave();
      openPreviewWindow(document.value, {
        projectId: activeRemoteProject.value?.id ?? 'local',
        templateId: activeTemplate.value.id, componentId: mode.value === 'library' ? activeDefinition.value?.id : null, canvasDark: canvasDark.value
      });
    } catch { error.value = 'zx_builder_preview_open_error'; }
  }
  const stylesOpen = ref(false);
  const workspaceView = ref('design');
  function updateComponentTheme(component, css) {
    parseThemeCss(css);
    commit(workspace => {
      const entries = workspace.componentThemes ??= [];
      const index = entries.findIndex(entry => entry.component === component);
      if (!css.trim()) { if (index >= 0) entries.splice(index, 1); }
      else if (index >= 0) entries[index] = { component, css };
      else entries.push({ component, css });
    });
  }
  const styleBridge = createStyleBridge();
  function ensureStyles() { document.value.styles ??= clone(stylePreset); }
  const modal = ref(null);
  const error = ref('');
  const saveStatus = ref('saved');
  const remoteProjects = ref([]);
  const activeRemoteProject = ref(null);
  const remoteSaveStatus = ref('local');
  const remoteConflict = ref(false);
  const remoteErrorDetail = ref('');
  const canEditRemote = computed(() => !activeRemoteProject.value || ['owner', 'editor'].includes(activeRemoteProject.value.role));
  const remoteProjectBusy = ref(false);
  let remoteSavePromise;
  let remoteTimer;
  let pendingRemoteSave = false;
  const auth = useAuth();
  const recovery = ref(null);
  const incoming = ref(null);
  const undoStack = ref([]);
  const redoStack = ref([]);
  let timer;
  let pendingSave = false;
  const activeTemplate = computed(() => document.value.templates.find(item => item.id === templateId.value) ?? document.value.templates[0]);
  const activeInstance = computed(() => activeTemplate.value?.instances.find(item => item.id === instanceId.value));
  const activeDefinition = computed(() => mode.value === 'library' ? document.value.library.find(item => item.id === libraryId.value) : activeInstance.value?.definition);
  const instanceLibraryDefinition = computed(() => mode.value === 'template' ? document.value.library.find(item => item.id === activeInstance.value?.sourceId) : null);
  const isSource = computed(() => !!activeDefinition.value?.sourceKey);
  const isSourceBase = computed(() => mode.value === 'library' && activeDefinition.value?.id === 'source:' + activeDefinition.value?.sourceKey);
  const hasSource = computed(() => sourceAvailable(activeDefinition.value));
  const selectedNode = computed(() => activeDefinition.value ? findNode(activeDefinition.value.tree, nodeId.value) : null);
  const nodeClipboard = ref(null);
  const clipboardNodeName = computed(() => nodeClipboard.value?.node.name ?? '');
  const canCopyNode = computed(() => Boolean(selectedNode.value && !isSource.value));
  const canPasteNode = computed(() => canPasteNodeAt());
  function copySelectedNode() {
    if (!canCopyNode.value) return false;
    try {
      nodeClipboard.value = snapshotNode(selectedNode.value, activeDefinition.value, mode.value === 'library' ? {} : activeInstance.value?.data ?? {}, document.value.library);
      return true;
    } catch (exception) { error.value = exception.message; return false; }
  }
  function clearNodeClipboard() { nodeClipboard.value = null; }
  function canPasteNodeAt(targetId = nodeId.value, position = 'after', targetInstanceId = instanceId.value) {
    return Boolean(nodeClipboard.value && canDropElement({ kind: 'clipboard' }, targetId, position, targetInstanceId));
  }
  function pasteNode(targetId = nodeId.value, position = 'after', targetInstanceId = instanceId.value) {
    if (!canPasteNodeAt(targetId, position, targetInstanceId)) return false;
    let definition = mode.value === 'library' ? activeDefinition.value : activeTemplate.value.instances.find(item => item.id === targetInstanceId)?.definition;
    let pasted;
    let destinationId = targetInstanceId;
    commit(() => {
      if (!definition) {
        const instance = createInstance(createDefinition(i18n.translate('zx_builder_new_name')));
        activeTemplate.value.instances.push(instance);
        definition = instance.definition;
        destinationId = instance.id;
      }
      pasted = materializeNode(nodeClipboard.value, definition, document.value.library);
      insertNode(definition.tree, pasted, targetId, position);
    });
    if (error.value) return false;
    selectInstance(destinationId, pasted.id);
    return true;
  }
  const previewInstances = computed(() => mode.value === 'library' ? (activeDefinition.value ? [{ id: 'library', name: activeDefinition.value.name, definition: activeDefinition.value, data: {} }] : []) : activeTemplate.value.instances);

  function flushSave() {
    clearTimeout(timer);
    if (!pendingSave || recovery.value !== null || incoming.value) return;
    try { saveWorkspace(document.value, storageKey); pendingSave = false; saveStatus.value = 'saved'; }
    catch { saveStatus.value = 'storage_error'; }
  }
  function setRemoteError(exception) {
    const message = exception?.message ?? 'Unknown Supabase error';
    const code = exception?.code ? ` (${exception.code})` : '';
    remoteErrorDetail.value = message + code;
    error.value = 'zx_builder_remote_error';
  }
  async function refreshRemoteProjects() {
    if (!auth.user.value) return false;
    try {
      const projects = await listRemoteProjects(auth.user.value.id);
      if (disposed) return false;
      remoteProjects.value = projects;
      return true;
    } catch { error.value = 'zx_builder_hub_load_error'; return false; }
  }
  function applyRemoteProject(project) {
    const workspace = validateWorkspace(clone(project.document));
    workspace.styles ??= clone(stylePreset);
    mergeSourceLibrary(workspace); refreshSourceSnapshots(workspace);
    validateWorkspace(workspace);
    document.value = workspace;
    selectTemplate(document.value.templates[0].id); libraryId.value = document.value.library[0]?.id; nodeId.value = null;
    activeRemoteProject.value = { id: project.id, name: project.name, owner_id: project.owner_id, revision: project.revision, updated_at: project.updated_at, role: project.role ?? 'viewer' };
    remoteConflict.value = false; pendingRemoteSave = false; remoteSaveStatus.value = 'saved';
    clearTimeout(timer); clearTimeout(remoteTimer); pendingSave = false;
    undoStack.value = []; redoStack.value = [];
    if (recovery.value === null) {
      try { saveWorkspace(document.value, storageKey); saveStatus.value = 'saved'; }
      catch { saveStatus.value = 'storage_error'; }
    }
  }
  async function openRemoteProject(id) {
    if (remoteProjectBusy.value) return false;
    remoteProjectBusy.value = true;
    try {
      await flushRemoteSave(false, true);
      if (id !== activeRemoteProject.value?.id && (remoteSaveStatus.value === 'error' || remoteConflict.value)) return false;
      const listed = remoteProjects.value.find(item => item.id === id);
      if (!listed) { error.value = 'zx_builder_hub_project_unavailable'; return false; }
      const project = await getRemoteProject(id);
      if (disposed) return false;
      applyRemoteProject({ ...project, role: listed.role });
      remoteProjects.value = remoteProjects.value.map(item => item.id === id ? { ...item, ...activeRemoteProject.value } : item);
      error.value = '';
      return true;
    } catch (exception) {
      setRemoteError(exception);
      error.value = exception.message?.startsWith('zx_builder_')
        ? exception.message : 'zx_builder_hub_project_unavailable';
      return false;
    } finally { remoteProjectBusy.value = false; }
  }
  async function prepareToLeave() {
    if (!workspaceReady.value) return true;
    if (remoteProjectBusy.value) return false;
    flushSave();
    await flushRemoteSave();
    if (pendingRemoteSave && !remoteConflict.value && remoteSaveStatus.value !== 'error') await flushRemoteSave();
    const saved = activeRemoteProject.value
      ? !remoteConflict.value && remoteSaveStatus.value !== 'error' && !pendingRemoteSave
      : saveStatus.value !== 'storage_error' && !pendingSave;
    if (!saved) error.value ||= 'zx_builder_hub_leave_error';
    return saved;
  }
  async function createRemoteProject(name) {
    if (!auth.user.value || remoteProjectBusy.value) return false;
    try {
      const project = await createRemoteProjectRecord(name, clone(document.value), auth.user.value.id);
      activeRemoteProject.value = project; remoteProjects.value = [project, ...remoteProjects.value]; remoteSaveStatus.value = 'saved'; remoteConflict.value = false;
      return true;
    } catch (exception) { setRemoteError(exception); return false; }
  }
  async function flushRemoteSave(force = false, duringMutation = false) {
    if (remoteProjectBusy.value && !duringMutation) return;
    clearTimeout(remoteTimer);
    if (force) pendingRemoteSave = true;
    if (remoteSavePromise) await remoteSavePromise;
    if (remoteProjectBusy.value && !duringMutation) return;
    if (!pendingRemoteSave || !activeRemoteProject.value || remoteConflict.value || !auth.user.value || !canEditRemote.value) return;
    const project = { ...activeRemoteProject.value };
    pendingRemoteSave = false; remoteSaveStatus.value = 'saving';
    remoteSavePromise = (async () => {
      try {
        const saved = await saveRemoteProject(project, clone(document.value));
        if (activeRemoteProject.value?.id !== project.id) return;
        if (!saved) { remoteConflict.value = true; remoteSaveStatus.value = 'conflict'; return; }
        activeRemoteProject.value = { ...activeRemoteProject.value, ...saved };
        const index = remoteProjects.value.findIndex(item => item.id === saved.id);
        if (index >= 0) remoteProjects.value[index] = { ...remoteProjects.value[index], ...activeRemoteProject.value };
        remoteSaveStatus.value = 'saved';
      } catch (exception) { pendingRemoteSave = true; remoteSaveStatus.value = 'error'; setRemoteError(exception); }
    })();
    try { await remoteSavePromise; } finally { remoteSavePromise = null; }
  }
  async function changeRemoteProject(action, id, name) {
    const project = activeRemoteProject.value;
    if (remoteProjectBusy.value || !project || project.id !== id) return false;
    if (!auth.user.value || !canEditRemote.value || (action === 'delete' && project.role !== 'owner')) {
      error.value = 'zx_builder_project_readonly'; return false;
    }
    if (action === 'rename' && (!name?.trim() || name.trim().length > 100)) return false;
    remoteProjectBusy.value = true; clearTimeout(remoteTimer);
    error.value = ''; remoteErrorDetail.value = '';
    try {
      if (action === 'rename') {
        await flushRemoteSave(false, true);
        if (remoteSaveStatus.value === 'error' || remoteConflict.value) {
          error.value ||= 'zx_builder_remote_conflict_notice'; return false;
        }
      } else if (remoteSavePromise) await remoteSavePromise;
      const current = activeRemoteProject.value;
      const result = action === 'rename' ? await renameRemoteProjectRecord(current, name.trim()) : await deleteRemoteProjectRecord(current);
      if (!result) {
        remoteConflict.value = true; remoteSaveStatus.value = 'conflict'; error.value = 'zx_builder_project_changed'; return false;
      }
      if (action === 'rename') {
        activeRemoteProject.value = { ...current, ...result };
        remoteProjects.value = remoteProjects.value.map(item => item.id === id ? { ...item, ...result } : item);
      } else {
        clearTimeout(remoteTimer); pendingRemoteSave = false;
        remoteProjects.value = remoteProjects.value.filter(item => item.id !== id);
        // Keep the open document available through the local editor after deletion.
        try { saveWorkspace(document.value); }
        catch { saveStatus.value = 'storage_error'; }
        activeRemoteProject.value = null; remoteConflict.value = false; remoteSaveStatus.value = 'local';
      }
      error.value = ''; remoteErrorDetail.value = '';
      return true;
    } catch (exception) { setRemoteError(exception); return false; }
    finally {
      remoteProjectBusy.value = false;
      if (pendingRemoteSave && activeRemoteProject.value && !remoteConflict.value && remoteSaveStatus.value !== 'error') scheduleRemoteSave();
    }
  }
  function renameRemoteProject(id, name) { return changeRemoteProject('rename', id, name); }
  function deleteRemoteProject(id) { return changeRemoteProject('delete', id); }
  function scheduleRemoteSave() {
    if (!activeRemoteProject.value || remoteConflict.value) return;
    pendingRemoteSave = true;
    if (remoteProjectBusy.value) return;
    remoteSaveStatus.value = 'saving'; clearTimeout(remoteTimer); remoteTimer = setTimeout(flushRemoteSave, 800);
  }
  function scheduleSave() {
    pendingSave = true;
    saveStatus.value = 'saving';
    clearTimeout(timer);
    timer = setTimeout(flushSave, 400);
    scheduleRemoteSave();
  }
  function commit(change) {
    if (!canEditRemote.value) { error.value = 'zx_builder_project_readonly'; return; }
    const before = clone(document.value);
    try {
      change(document.value);
      ensureStyles();
      refreshSourceSnapshots(document.value);
      validateWorkspace(document.value);
      document.value.updatedAt = new Date().toISOString();
      undoStack.value.push(before);
      if (undoStack.value.length > 50) undoStack.value.shift();
      redoStack.value = [];
      error.value = '';
      scheduleSave();
    } catch (exception) { document.value = before; error.value = exception.message; }
  }
  function undo() {
    if (!canEditRemote.value) { error.value = 'zx_builder_project_readonly'; return; }
    if (!undoStack.value.length) return;
    redoStack.value.push(clone(document.value));
    document.value = undoStack.value.pop();
    scheduleSave();
  }
  function redo() {
    if (!canEditRemote.value) { error.value = 'zx_builder_project_readonly'; return; }
    if (!redoStack.value.length) return;
    undoStack.value.push(clone(document.value));
    document.value = redoStack.value.pop();
    scheduleSave();
  }
  function selectTemplate(id) { templatesOpen.value = false; mode.value = 'template'; templateId.value = id; instanceId.value = activeTemplate.value.instances[0]?.id; nodeId.value = null; }
  function selectLibrary(id) {
    templatesOpen.value = false;
    mode.value = 'library'; libraryId.value = id; nodeId.value = null;
    libraryKind.value = activeDefinition.value?.kind === 'zvp' ? 'zvp' : 'zvc';
    libraryCategory.value = isSourceBase.value ? 'imported' : 'project';
    if (![activeDefinition.value?.name, activeDefinition.value?.exportName, activeDefinition.value?.sourceKey]
      .some(value => value?.toLowerCase().includes(librarySearch.value.trim().toLowerCase()))) librarySearch.value = '';
    if (isSource.value) inspectorTab.value = 'data';
  }
  function selectInstance(id, selectedId = null) { templatesOpen.value = false; if (mode.value !== 'library') instanceId.value = id; nodeId.value = isSource.value ? null : selectedId; if (isSource.value || selectedPartial.value) inspectorTab.value = 'data'; }
  function restoreActiveInstance() {
    if (!canEditRemote.value || !activeInstance.value || !instanceLibraryDefinition.value) return;
    commit(() => {
      Object.assign(activeInstance.value, restoreInstance(activeInstance.value, instanceLibraryDefinition.value));
    });
    if (!error.value) { nodeId.value = null; inspectorTab.value = 'data'; }
  }
  function insertInstance(definitionId, beforeId = null, position = 'before') {
    if (!canEditRemote.value) return;
    const definition = document.value.library.find(item => item.id === definitionId);
    if (!definition) return;
    const instance = createInstance(definition);
    commit(() => {
      const index = activeTemplate.value.instances.findIndex(item => item.id === beforeId);
      activeTemplate.value.instances.splice(index < 0 ? activeTemplate.value.instances.length : index + (position === 'after' ? 1 : 0), 0, instance);
    });
    if (error.value) return;
    mode.value = 'template'; instanceId.value = instance.id; nodeId.value = null; if (isSource.value) inspectorTab.value = 'data';
    revealOutline(instance.id);
    reveal(instance.id);
  }
  function moveInstance(id, targetId, position = 'before') {
    if (id === targetId) return;
    commit(() => {
      const list = activeTemplate.value.instances;
      const index = list.findIndex(item => item.id === id);
      if (index < 0) return;
      const [instance] = list.splice(index, 1);
      const targetIndex = list.findIndex(item => item.id === targetId);
      list.splice(targetIndex < 0 ? list.length : targetIndex + (position === 'after' ? 1 : 0), 0, instance);
    });
  }
  function appendLibraryDefinition(workspace, definition) {
    if (definition.kind === 'zvp') {
      const names = new Set(workspace.library.map(item => item.exportName));
      const base = definition.exportName;
      for (let suffix = 2; names.has(definition.exportName); suffix++) definition.exportName = base + suffix;
    }
    workspace.library.push(definition);
  }
  function newComponent(name, kind = 'zvc') {
    const definition = createDefinition(name, kind);
    commit(workspace => appendLibraryDefinition(workspace, definition));
    selectLibrary(definition.id); leftTab.value = 'elements';
  }
  function newTemplate(name) {
    const template = createTemplate(name);
    commit(workspace => workspace.templates.push(template));
    selectTemplate(template.id);
  }
  function rename(kind, id, name) {
    if (!name.trim()) return;
    if (kind === 'library' && id.startsWith('source:')) { error.value = 'zx_builder_source_base_notice'; return; }
    commit(workspace => {
      const item = kind === 'template' ? workspace.templates.find(item => item.id === id) : kind === 'library' ? workspace.library.find(item => item.id === id) : activeTemplate.value.instances.find(item => item.id === id);
      if (!item) return;
      item.name = name.trim();
      if (kind === 'library' && (!item.sourceKey || item.kind === 'zvp')) {
        const base = exportName(name, item.kind);
        item.exportName = base;
        for (let suffix = 2; item.kind === 'zvp' && workspace.library.some(other => other.id !== id && other.exportName === item.exportName); suffix++) item.exportName = base + suffix;
      }
    });
  }
  function duplicate(kind, id) {
    const suffix = ` (${i18n.translate('zx_builder_copy_suffix')})`;
    commit(workspace => {
      if (kind === 'template') {
        const original = workspace.templates.find(item => item.id === id);
        const copy = { ...clone(original), id: uid(), name: original.name + suffix, instances: original.instances.map(item => ({ ...clone(item), id: uid(), definition: copyDefinition(item.definition) })) };
        workspace.templates.push(copy); selectTemplate(copy.id);
      } else if (kind === 'library') {
        const original = workspace.library.find(item => item.id === id);
        const copy = copyDefinition(original, original.name + suffix); appendLibraryDefinition(workspace, copy); selectLibrary(copy.id);
      } else {
        const list = activeTemplate.value.instances;
        const index = list.findIndex(item => item.id === id);
        const copy = { ...clone(list[index]), id: uid(), name: list[index].name + suffix, definition: copyDefinition(list[index].definition) };
        list.splice(index + 1, 0, copy); instanceId.value = copy.id;
      }
    });
  }
  function remove(kind, id) {
    if (kind === 'library' && id.startsWith('source:')) { error.value = 'zx_builder_source_base_notice'; return; }
    if (kind === 'template' && document.value.templates.length === 1) { error.value = 'zx_builder_last_template'; return; }
    commit(workspace => {
      const list = kind === 'template' ? workspace.templates : kind === 'library' ? workspace.library : activeTemplate.value.instances;
      const index = list.findIndex(item => item.id === id);
      if (index >= 0) list.splice(index, 1);
      nodeId.value = null;
    });
  }
  function editableStructure() { if (!isSource.value) return true; error.value = 'zx_builder_source_structure'; return false; }
  function updateNode(props) {
    if (!editableStructure() || !selectedNode.value) return;
    commit(() => { selectedNode.value.props = clone(props); });
  }
  function changeNodeType(name) {
    if (!editableStructure() || !selectedNode.value || selectedNode.value.name === name) return;
    let replacement;
    try { replacement = elementNode(name); } catch (exception) { error.value = exception.message; return; }
    commit(() => {
      selectedNode.value.name = replacement.name;
      selectedNode.value.props = replacement.props;
      if (!selectedNode.value.children.length) selectedNode.value.children = replacement.children;
    });
  }
  const availablePartials = computed(() => partialDefinitions(activeDefinition.value, document.value.library));
  const selectablePartials = computed(() => partialDefinitions({
    ...activeDefinition.value,
    partials: (activeDefinition.value?.partials ?? []).filter(partial => !partial.libraryId)
  }, document.value.library));
  const selectedPartial = computed(() => availablePartials.value.find(item => item.exportName === selectedNode.value?.name));
  function partialLibraryDefinition(partial) { return findPartialLibraryDefinition(partial, document.value.library); }
  function restorePartialReference(reference) {
    if (!reference || !activeDefinition.value || isSource.value || !canEditRemote.value) return;
    commit(() => restorePartial(activeDefinition.value, reference, document.value.library, mode.value === 'template' ? activeInstance.value?.data : {}));
  }
  function insertPartial(id) {
    const partial = document.value.library.find(item => item.id === id && item.kind === 'zvp');
    if (!partial) return;
    if (mode.value === 'library') {
      mode.value = 'template';
      instanceId.value = activeTemplate.value.instances.find(item => !item.definition.sourceKey)?.id ?? null;
      nodeId.value = null;
    }
    addElement(partial.exportName);
  }
  function elementNode(name) {
    const partial = availablePartials.value.find(item => item.exportName === name);
    return partial ? createNode(name, dataFor(partial)) : catalogNode(name);
  }
  function addElement(name, targetId = nodeId.value, position = 'after', targetInstanceId = instanceId.value) {
    if (mode.value !== 'library' && targetInstanceId) instanceId.value = targetInstanceId;
    if (!editableStructure()) return;
    let node;
    try { node = elementNode(name); } catch (exception) { error.value = exception.message; return; }
    commit(() => {
      if (!activeDefinition.value) {
        const definition = createDefinition(i18n.translate('zx_builder_new_name'));
        const instance = createInstance(definition);
        activeTemplate.value.instances.push(instance); instanceId.value = instance.id;
      }
      insertNode(activeDefinition.value.tree, node, targetId, position);
    });
    nodeId.value = node.id;
  }
  function insertOverlayContent(name) {
    if (!editableStructure() || !selectedNode.value || !['ZModal', 'OffCanvas'].includes(selectedNode.value.name)) return;
    let node;
    try { node = elementNode(name); } catch (exception) { error.value = exception.message; return; }
    commit(() => { selectedNode.value.children.push(node); });
  }
  function removeOverlayContent(index) {
    if (!canEditRemote.value || !editableStructure() || !selectedNode.value) return;
    commit(() => { selectedNode.value.children.splice(index, 1); });
  }
  function duplicateOverlayContent(index) {
    if (!canEditRemote.value || !editableStructure() || !selectedNode.value) return;
    const source = selectedNode.value.children[index];
    if (!source) return;
    const node = copyNode(source);
    commit(() => { selectedNode.value.children.splice(index + 1, 0, node); });
  }
  function moveOverlayContent(index, delta) {
    if (!canEditRemote.value || !editableStructure() || !selectedNode.value) return;
    const list = selectedNode.value.children;
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    commit(() => { const [item] = list.splice(index, 1); list.splice(target, 0, item); });
  }
  function canDropElement(payload, targetId, position, targetInstanceId) {
    if (!canEditRemote.value || !payload || !['before', 'after', 'inside'].includes(position)) return false;
    if (payload.kind === 'library') return document.value.library.some(item => item.id === payload.id);
    if (payload.kind === 'instance') return mode.value === 'template' && payload.id !== targetInstanceId && activeTemplate.value.instances.some(item => item.id === payload.id);
    if (!['node', 'catalog', 'clipboard'].includes(payload.kind)) return false;
    if (payload.kind === 'clipboard' && !nodeClipboard.value) return false;
    const definition = mode.value === 'library' ? activeDefinition.value : activeTemplate.value.instances.find(item => item.id === targetInstanceId)?.definition;
    if (!definition) return mode.value === 'template' && ['catalog', 'clipboard'].includes(payload.kind) && !targetId && !targetInstanceId && position !== 'inside';
    if (definition.sourceKey) return false;
    const target = targetId ? findNode(definition.tree, targetId) : null;
    if (targetId && !target) return false;
    if (position === 'inside' && (!target || !containers.includes(target.name))) return false;
    if (['catalog', 'clipboard'].includes(payload.kind)) return true;
    if (mode.value === 'template' && payload.instanceId !== targetInstanceId) {
      const origin = activeTemplate.value.instances.find(item => item.id === payload.instanceId)?.definition;
      return Boolean(origin && !origin.sourceKey && findNode(origin.tree, payload.id));
    }
    const source = findNode(definition.tree, payload.id);
    return Boolean(source && payload.id !== targetId && !findNode(source.children, targetId));
  }
  function dropElement(payload, targetId, position, targetInstanceId) {
    if (!canDropElement(payload, targetId, position, targetInstanceId)) return;
    if (payload.kind === 'clipboard') { pasteNode(targetId, position, targetInstanceId); return; }
    if (payload.kind === 'library') { insertInstance(payload.id, targetInstanceId, position); return; }
    if (payload.kind === 'instance') { moveInstance(payload.id, targetInstanceId, position); return; }
    if (payload.kind === 'catalog') { addElement(payload.name, targetId, position, targetInstanceId); return; }
    if (payload.kind !== 'node') return;
    if (mode.value === 'template' && payload.instanceId !== targetInstanceId) {
      const origin = activeTemplate.value.instances.find(item => item.id === payload.instanceId);
      const destination = activeTemplate.value.instances.find(item => item.id === targetInstanceId);
      let moved;
      commit(() => {
        const location = locateNode(origin.definition.tree, payload.id);
        const snapshot = snapshotNode(location.list[location.index], origin.definition, origin.data, document.value.library);
        moved = materializeNode(snapshot, destination.definition, document.value.library);
        insertNode(destination.definition.tree, moved, targetId, position);
        location.list.splice(location.index, 1);
      });
      if (!error.value) selectInstance(targetInstanceId, moved.id);
      return;
    }
    selectInstance(targetInstanceId, payload.id);
    if (!editableStructure()) return;
    commit(() => moveNode(activeDefinition.value.tree, payload.id, targetId, position));
  }
  function deleteNode() {
    if (!canEditRemote.value || !editableStructure() || !selectedNode.value) return;
    commit(() => { const location = locateNode(activeDefinition.value.tree, nodeId.value); location.list.splice(location.index, 1); });
    if (!error.value) nodeId.value = null;
  }
  function duplicateNode() {
    if (!canEditRemote.value || !editableStructure() || !selectedNode.value) return;
    const node = copyNode(selectedNode.value);
    commit(() => insertNode(activeDefinition.value.tree, node, nodeId.value));
    if (!error.value) nodeId.value = node.id;
  }
  function wrapNode() {
    if (!canEditRemote.value || !editableStructure() || !selectedNode.value) return;
    let wrapper;
    commit(() => { wrapper = wrapTreeNode(activeDefinition.value.tree, nodeId.value); });
    if (!error.value) nodeId.value = wrapper.id;
  }
  function shiftNode(direction) {
    if (!editableStructure() || !selectedNode.value) return;
    const location = locateNode(activeDefinition.value.tree, nodeId.value);
    const target = location.list[location.index + direction];
    if (target) commit(() => moveNode(activeDefinition.value.tree, nodeId.value, target.id, direction < 0 ? 'before' : 'after'));
  }
  function updateProjectFonts(fonts) { const selected = projectFonts(fonts); commit(workspace => { workspace.styles.fonts = selected; }); }
  function updateStyleVariable(name, value, type) { commit(() => setStyleVariable(document.value.styles, name, value, type)); }
  function updateStyleUI(path, value) { commit(() => setUIValue(document.value.styles, path, value)); }
  function replaceStyles(preset) { validateStylePreset(preset); commit(() => { document.value.styles = { ...clone(preset), uiSettings: clone(preset.uiSettings ?? {}) }; }); }
  function resetStyles() { replaceStyles(stylePreset); }
  function updateProjectCover(url) {
    if (!activeRemoteProject.value) return;
    commit(workspace => { workspace.coverImage = url ?? ''; });
  }
  function updateLibraryPreview(id, url) {
    commit(workspace => {
      const definition = workspace.library.find(item => item.id === id);
      if (definition) definition.previewImage = url ?? '';
    });
  }
  function updateDefinition(change) {
    if (isSourceBase.value) { error.value = 'zx_builder_source_base_notice'; return; }
    if (activeDefinition.value) commit(() => change(activeDefinition.value));
  }
  function convertToVisual() {
    if (!isSource.value) return;
    const copy = visualSourceCopy(activeDefinition.value, mode.value === 'template' ? activeInstance.value.data : {});
    if (isSourceBase.value) { copy.id = uid(); copy.name += ' (' + i18n.translate('zx_builder_visual') + ')'; commit(workspace => appendLibraryDefinition(workspace, copy)); selectLibrary(copy.id); }
    else commit(() => { Object.keys(activeDefinition.value).forEach(key => delete activeDefinition.value[key]); Object.assign(activeDefinition.value, copy); if (mode.value === 'template') activeInstance.value.data = {}; });
    nodeId.value = null; inspectorTab.value = 'properties'; leftTab.value = 'library';
  }
  function updateData(key, value) { if (activeInstance.value) commit(() => { if (value === undefined) delete activeInstance.value.data[key]; else activeInstance.value.data[key] = value; }); }
  function saveToLibrary(name) {
    if (!activeDefinition.value) return;
    const copy = copyDefinition(activeDefinition.value, name);
    if (mode.value === 'template' && copy.sourceKey) copy.defaults = { ...copy.defaults, ...clone(activeInstance.value.data) };
    if (mode.value === 'template') copy.fields.forEach(field => { if (Object.hasOwn(activeInstance.value.data, field.key)) field.default = clone(activeInstance.value.data[field.key]); });
    commit(workspace => appendLibraryDefinition(workspace, copy));
  }
  function importDocument(payload) {
    commit(workspace => {
      if (payload.kind === 'workspace') { document.value = clone(payload.data); mergeSourceLibrary(document.value); }
      if (payload.kind === 'component') { const definition = copyDefinition(payload.data); appendLibraryDefinition(workspace, definition); selectLibrary(definition.id); }
      if (payload.kind === 'template') {
        const template = clone(payload.data); template.id = uid();
        template.instances = template.instances.map(item => ({ ...item, id: uid(), definition: copyDefinition(item.definition) }));
        workspace.templates.push(template); selectTemplate(template.id);
      }
    });
    if (payload.kind === 'workspace') selectTemplate(document.value.templates[0].id);
  }
  function resolveConflict(useIncoming) {
    if (useIncoming) { document.value = incoming.value; ensureStyles(); mergeSourceLibrary(document.value); refreshSourceSnapshots(document.value); undoStack.value = []; redoStack.value = []; selectTemplate(document.value.templates[0].id); }
    incoming.value = null; scheduleSave();
  }
  function storageChanged(event) {
    if (event.key !== storageKey || !event.newValue || event.newValue === JSON.stringify(document.value)) return;
    try { incoming.value = validateWorkspace(parseJson(event.newValue)); clearTimeout(timer); } catch { error.value = 'zx_builder_invalid_document'; }
  }
  function hotkey(event) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable || modal.value) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); flushSave(); }
    if (event.key === 'Escape') { nodeId.value = null; previewOnly.value = false; }
  }
  onMounted(async () => {
    const loaded = loadWorkspace(storageKey);
    if (loaded.data) { document.value = loaded.data; selectTemplate(document.value.templates[0].id); libraryId.value = document.value.library[0]?.id; }
    ensureStyles();
    watch(() => document.value.styles, value => styleBridge.apply(value), { immediate: true, deep: true });
    try { mergeSourceLibrary(document.value); refreshSourceSnapshots(document.value); validateWorkspace(document.value); } catch (exception) { error.value = exception.message; }
    if (loaded.error) { recovery.value = loaded.raw ?? ''; saveStatus.value = 'storage_error'; }
    try { i18n.setLanguage(localStorage.getItem('zx_builder_language') ?? 'it'); } catch { /* No preference when storage is unavailable. */ }
    window.addEventListener('beforeunload', flushSave); window.addEventListener('storage', storageChanged); window.addEventListener('keydown', hotkey);
    if (projectId) {
      if (await refreshRemoteProjects() && !disposed) workspaceReady.value = await openRemoteProject(projectId);
    } else {
      workspaceReady.value = true;
      refreshRemoteProjects();
    }
  });
  onBeforeUnmount(() => { disposed = true; thumbnailRenderer.dispose(); styleBridge.dispose(); flushSave(); flushRemoteSave(); window.removeEventListener('beforeunload', flushSave); window.removeEventListener('storage', storageChanged); window.removeEventListener('keydown', hotkey); });
  function collapseAllOutline() {
    const next = new Set(collapsedOutline.value);
    const walk = (nodes, prefix) => {
      for (const node of nodes) {
        next.add(prefix + node.id);
        if (node.children?.length) walk(node.children, prefix);
      }
    };
    if (mode.value === 'library' && activeDefinition.value) {
      next.add('definition:' + activeDefinition.value.id);
      walk(activeDefinition.value.tree, 'node:library:');
    } else {
      for (const instance of activeTemplate.value.instances) {
        next.add('instance:' + instance.id);
        walk(instance.definition.tree, 'node:' + instance.id + ':');
      }
    }
    collapsedOutline.value = next;
  }
  const api = { templatesOpen, clipboardNodeName, canCopyNode, canPasteNode, copySelectedNode, pasteNode, canPasteNodeAt, clearNodeClipboard, ...i18n, canvasDark, previewHeaderHidden, updateBodyBackground, openPreviewPage, selectablePartials, libraryKind, partialLibraryDefinition, restorePartialReference, availablePartials, selectedPartial, insertPartial, workspaceView, updateComponentTheme, updateProjectFonts, updateProjectCover, updateLibraryPreview, collapsedOutline, toggleOutline, collapseAllOutline, revealTarget, reveal, revealOutlineTarget, revealOutline, instanceLibraryDefinition, restoreActiveInstance, workspaceReady, prepareToLeave, document, mode, templateId, libraryId, instanceId, nodeId, leftTab, libraryCategory, librarySearch, inspectorTab, viewportMode, simpleViewport, viewport, viewportWidth, viewportLabel, viewportOptions, simpleViewportOptions, followViewportStyles, viewportStyleScope, previewOnly, stylesOpen, updateStyleVariable, updateStyleUI, replaceStyles, resetStyles, modal, error, saveStatus, recovery, incoming, undoStack, redoStack, activeTemplate, activeInstance, activeDefinition, isSource, isSourceBase, hasSource, convertToVisual, selectedNode, previewInstances, remoteProjects, activeRemoteProject, remoteProjectBusy, renameRemoteProject, deleteRemoteProject, remoteSaveStatus, remoteConflict, remoteErrorDetail, canEditRemote, refreshRemoteProjects, openRemoteProject, createRemoteProject, flushRemoteSave, commit, undo, redo, selectTemplate, selectLibrary, selectInstance, insertInstance, moveInstance, newComponent, newTemplate, rename, duplicate, remove, updateNode, changeNodeType, addElement, insertOverlayContent, removeOverlayContent, duplicateOverlayContent, moveOverlayContent, canDropElement, dropElement, deleteNode, duplicateNode, wrapNode, shiftNode, updateDefinition, updateData, saveToLibrary, importDocument, resolveConflict, flushSave, scheduleSave };
  Object.assign(api, { thumbnailBatch, refreshLibraryThumbnails, libraryThumbnails, libraryThumbnailSource, ensureLibraryThumbnail, refreshLibraryThumbnail });
  provide(key, api);
  return api;
}
