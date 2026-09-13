import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { createWorkspace, createDefinition, copyDefinition, createInstance, createTemplate, exportName } from '../../domain/workspace.js';
import { clone, uid, findNode, locateNode, copyNode, insertNode, moveNode } from '../../domain/nodes.js';
import { validateWorkspace, validateDefinition, parseJson } from '../../domain/validation.js';
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from '../services/storage.js';
import { catalogNode, containers } from '../services/catalog.js';
import { viewports, simpleViewports, styleScopeForWidth } from '../../integrations/zaux/viewports.js';
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
  const mode = ref('template');
  const templateId = ref(document.value.templates[0].id);
  const libraryId = ref(document.value.library[0]?.id);
  const instanceId = ref(document.value.templates[0].instances[0]?.id);
  const nodeId = ref(null);
  const leftTab = ref('library');
  const inspectorTab = ref('properties');
  const viewportMode = ref('simple');
  const simpleViewport = ref('auto');
  const viewport = ref('auto');
  const followViewportStyles = ref(true);
  const viewportWidth = computed(() => viewportMode.value === 'simple'
    ? (simpleViewports.find(item => item.value === simpleViewport.value)?.width ?? null)
    : viewports.find(item => item.name === viewport.value)?.width ?? null);
  const viewportStyleScope = computed(() => styleScopeForWidth(viewportWidth.value));
  const viewportLabel = computed(() => viewportWidth.value === null
    ? i18n.translate('zx_builder_viewport_auto')
    : `${viewportMode.value === 'simple' ? i18n.translate(`zx_builder_${simpleViewport.value}`) : viewport.value} - ${viewportWidth.value} PX`);
  const simpleViewportOptions = computed(() => simpleViewports.map(item => ({
    value: item.value,
    label: i18n.translate(item.label) + (item.minWidth === undefined ? '' : ' (≥ ' + item.minWidth + ' px)')
  })));
  const viewportOptions = computed(() => [
    { value: 'auto', label: i18n.translate('zx_builder_viewport_auto') },
    ...viewports.map(item => ({ value: item.name, label: `${item.name} (${item.width} px)` }))
  ]);
  const previewOnly = ref(false);
  const stylesOpen = ref(false);
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
  const isSource = computed(() => !!activeDefinition.value?.sourceKey);
  const isSourceBase = computed(() => mode.value === 'library' && activeDefinition.value?.id === 'source:' + activeDefinition.value?.sourceKey);
  const hasSource = computed(() => sourceAvailable(activeDefinition.value));
  const selectedNode = computed(() => activeDefinition.value ? findNode(activeDefinition.value.tree, nodeId.value) : null);
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
    const workspace = validateWorkspace(project.document);
    document.value = clone(workspace); ensureStyles(); mergeSourceLibrary(document.value); refreshSourceSnapshots(document.value);
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
      error.value = 'zx_builder_hub_project_unavailable';
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
  function selectTemplate(id) { mode.value = 'template'; templateId.value = id; instanceId.value = activeTemplate.value.instances[0]?.id; nodeId.value = null; }
  function selectLibrary(id) { mode.value = 'library'; libraryId.value = id; nodeId.value = null; if (isSource.value) inspectorTab.value = 'data'; }
  function selectInstance(id, selectedId = null) { if (mode.value !== 'library') instanceId.value = id; nodeId.value = isSource.value ? null : selectedId; if (isSource.value) inspectorTab.value = 'data'; }
  function insertInstance(definitionId, beforeId = null, position = 'before') {
    const definition = document.value.library.find(item => item.id === definitionId);
    if (!definition) return;
    const instance = createInstance(definition);
    commit(() => {
      const index = activeTemplate.value.instances.findIndex(item => item.id === beforeId);
      activeTemplate.value.instances.splice(index < 0 ? activeTemplate.value.instances.length : index + (position === 'after' ? 1 : 0), 0, instance);
    });
    mode.value = 'template'; instanceId.value = instance.id; nodeId.value = null; if (isSource.value) inspectorTab.value = 'data';
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
  function newComponent(name) {
    const definition = createDefinition(name);
    commit(workspace => workspace.library.push(definition));
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
      if (kind === 'library' && !item.sourceKey) item.exportName = exportName(name);
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
        const copy = copyDefinition(original, original.name + suffix); workspace.library.push(copy); selectLibrary(copy.id);
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
    try { replacement = catalogNode(name); } catch (exception) { error.value = exception.message; return; }
    commit(() => {
      selectedNode.value.name = replacement.name;
      selectedNode.value.props = replacement.props;
    });
  }
  function addElement(name, targetId = nodeId.value, position = 'after', targetInstanceId = instanceId.value) {
    if (mode.value !== 'library' && targetInstanceId) instanceId.value = targetInstanceId;
    if (!editableStructure()) return;
    let node;
    try { node = catalogNode(name); } catch (exception) { error.value = exception.message; return; }
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
  function canDropElement(payload, targetId, position, targetInstanceId) {
    if (!canEditRemote.value || !payload || !['before', 'after', 'inside'].includes(position)) return false;
    if (payload.kind === 'library') return document.value.library.some(item => item.id === payload.id);
    if (payload.kind === 'instance') return mode.value === 'template' && payload.id !== targetInstanceId && activeTemplate.value.instances.some(item => item.id === payload.id);
    if (!['node', 'catalog'].includes(payload.kind)) return false;
    const definition = mode.value === 'library' ? activeDefinition.value : activeTemplate.value.instances.find(item => item.id === targetInstanceId)?.definition;
    if (!definition) return payload.kind === 'catalog' && !targetId && !targetInstanceId && position !== 'inside';
    if (definition.sourceKey) return false;
    const target = targetId ? findNode(definition.tree, targetId) : null;
    if (targetId && !target) return false;
    if (position === 'inside' && (!target || !containers.includes(target.name))) return false;
    if (payload.kind === 'catalog') return true;
    if (payload.instanceId !== targetInstanceId) return false;
    const source = findNode(definition.tree, payload.id);
    return Boolean(source && payload.id !== targetId && !findNode(source.children, targetId));
  }
  function dropElement(payload, targetId, position, targetInstanceId) {
    if (!canDropElement(payload, targetId, position, targetInstanceId)) return;
    if (payload.kind === 'library') { insertInstance(payload.id, targetInstanceId, position); return; }
    if (payload.kind === 'instance') { moveInstance(payload.id, targetInstanceId, position); return; }
    if (payload.kind === 'catalog') { addElement(payload.name, targetId, position, targetInstanceId); return; }
    if (payload.kind !== 'node') return;
    if (mode.value !== 'library' && payload.instanceId !== targetInstanceId) return;
    selectInstance(targetInstanceId, payload.id);
    if (!editableStructure()) return;
    commit(() => moveNode(activeDefinition.value.tree, payload.id, targetId, position));
  }
  function deleteNode() {
    if (!editableStructure() || !selectedNode.value) return;
    commit(() => { const location = locateNode(activeDefinition.value.tree, nodeId.value); location.list.splice(location.index, 1); });
    nodeId.value = null;
  }
  function duplicateNode() {
    if (!editableStructure() || !selectedNode.value) return;
    const node = copyNode(selectedNode.value);
    commit(() => insertNode(activeDefinition.value.tree, node, nodeId.value));
    nodeId.value = node.id;
  }
  function shiftNode(direction) {
    if (!editableStructure() || !selectedNode.value) return;
    const location = locateNode(activeDefinition.value.tree, nodeId.value);
    const target = location.list[location.index + direction];
    if (target) commit(() => moveNode(activeDefinition.value.tree, nodeId.value, target.id, direction < 0 ? 'before' : 'after'));
  }
  function updateStyleVariable(name, value, type) { commit(() => setStyleVariable(document.value.styles, name, value, type)); }
  function updateStyleUI(path, value) { commit(() => setUIValue(document.value.styles, path, value)); }
  function replaceStyles(preset) { validateStylePreset(preset); commit(() => { document.value.styles = { ...clone(preset), uiSettings: clone(preset.uiSettings ?? {}) }; }); }
  function resetStyles() { replaceStyles(stylePreset); }
  function updateDefinition(change) {
    if (isSourceBase.value) { error.value = 'zx_builder_source_base_notice'; return; }
    if (activeDefinition.value) commit(() => change(activeDefinition.value));
  }
  function convertToVisual() {
    if (!isSource.value) return;
    const copy = visualSourceCopy(activeDefinition.value, mode.value === 'template' ? activeInstance.value.data : {});
    if (isSourceBase.value) { copy.id = uid(); copy.name += ' (' + i18n.translate('zx_builder_visual') + ')'; commit(workspace => workspace.library.push(copy)); selectLibrary(copy.id); }
    else commit(() => { Object.keys(activeDefinition.value).forEach(key => delete activeDefinition.value[key]); Object.assign(activeDefinition.value, copy); if (mode.value === 'template') activeInstance.value.data = {}; });
    nodeId.value = null; inspectorTab.value = 'properties'; leftTab.value = 'outline';
  }
  function updateData(key, value) { if (activeInstance.value) commit(() => { if (value === undefined) delete activeInstance.value.data[key]; else activeInstance.value.data[key] = value; }); }
  function saveToLibrary(name) {
    if (!activeDefinition.value) return;
    const copy = copyDefinition(activeDefinition.value, name);
    if (mode.value === 'template' && copy.sourceKey) copy.defaults = { ...copy.defaults, ...clone(activeInstance.value.data) };
    if (mode.value === 'template') copy.fields.forEach(field => { if (Object.hasOwn(activeInstance.value.data, field.key)) field.default = clone(activeInstance.value.data[field.key]); });
    commit(workspace => workspace.library.push(copy));
  }
  function importDocument(payload) {
    commit(workspace => {
      if (payload.kind === 'workspace') { document.value = clone(payload.data); mergeSourceLibrary(document.value); }
      if (payload.kind === 'component') { const definition = copyDefinition(payload.data); workspace.library.push(definition); selectLibrary(definition.id); }
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
  onBeforeUnmount(() => { disposed = true; styleBridge.dispose(); flushSave(); flushRemoteSave(); window.removeEventListener('beforeunload', flushSave); window.removeEventListener('storage', storageChanged); window.removeEventListener('keydown', hotkey); });
  const api = { ...i18n, workspaceReady, prepareToLeave, document, mode, templateId, libraryId, instanceId, nodeId, leftTab, inspectorTab, viewportMode, simpleViewport, viewport, viewportWidth, viewportLabel, viewportOptions, simpleViewportOptions, followViewportStyles, viewportStyleScope, previewOnly, stylesOpen, updateStyleVariable, updateStyleUI, replaceStyles, resetStyles, modal, error, saveStatus, recovery, incoming, undoStack, redoStack, activeTemplate, activeInstance, activeDefinition, isSource, isSourceBase, hasSource, convertToVisual, selectedNode, previewInstances, remoteProjects, activeRemoteProject, remoteProjectBusy, renameRemoteProject, deleteRemoteProject, remoteSaveStatus, remoteConflict, remoteErrorDetail, canEditRemote, refreshRemoteProjects, openRemoteProject, createRemoteProject, flushRemoteSave, commit, undo, redo, selectTemplate, selectLibrary, selectInstance, insertInstance, moveInstance, newComponent, newTemplate, rename, duplicate, remove, updateNode, changeNodeType, addElement, canDropElement, dropElement, deleteNode, duplicateNode, shiftNode, updateDefinition, updateData, saveToLibrary, importDocument, resolveConflict, flushSave, scheduleSave };
  provide(key, api);
  return api;
}
