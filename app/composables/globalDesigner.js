import { ref } from 'vue';
import { createTemplate, createWorkspace } from '../../domain/workspace.js';
import { validateWorkspace } from '../../domain/validation.js';
import { globalChanges, globalDefinition, globalRecord, sampleGlobalDefinitions } from '../../domain/global-components.js';
import { mergeSourceLibrary, refreshSourceSnapshots } from '../services/source-zvc.js';
import { archiveGlobalComponent, createGlobalComponent, listGlobalComponents, updateGlobalComponent } from '../services/global-components.js';
import { zauxProjectVersion } from '../../integrations/zaux/version.js';

const CONFLICT = 'zx_builder_global_conflict';

// Persistence of the Component designer: the editor works on an ordinary workspace whose library
// holds the global components (plus the bundled source bases). Each commit is diffed against the
// last saved JSON per component and written row by row, signed with the running Zaux version.
// Styles, fonts and component themes in this workspace are never saved: they only try out looks.
export function createGlobalDesigner({ document, saveStatus, error, userId, onError }) {
  const saved = new Map();
  // Hub-generated thumbnails by component id, shown on the designer library cards (read-only here).
  const thumbnails = ref(Object.create(null));
  let timer;
  let pending = false;
  let running = null;

  function remember(row, json) { saved.set(row.id, { revision: row.revision, json, archived: false }); }

  async function load(translate) {
    clearTimeout(timer); pending = false;
    let rows = await listGlobalComponents({ definitions: true, thumbnails: true });
    const workspace = createWorkspace();
    // Stable id: library card previews stay cached across designer sessions.
    workspace.id = 'global-designer';
    workspace.name = translate('zx_builder_global_designer');
    workspace.templates = [createTemplate(translate('zx_builder_global_designer'))];
    workspace.library = [];
    if (!rows.length) {
      // First use: seed the shared library with a ZVP and a ZVC that references it.
      workspace.library = sampleGlobalDefinitions(translate);
      refreshSourceSnapshots(workspace);
      rows = [];
      for (const definition of workspace.library) rows.push({ ...await createGlobalComponent(globalRecord(definition, zauxProjectVersion), userId()), definition });
    } else {
      for (const row of rows) {
        // An unreadable row is left untouched in the database (and never archived by the diff).
        try { workspace.library.push(globalDefinition(row)); } catch { row.invalid = true; }
      }
    }
    mergeSourceLibrary(workspace);
    refreshSourceSnapshots(workspace);
    validateWorkspace(workspace);
    saved.clear();
    thumbnails.value = Object.fromEntries(rows.filter(row => row.thumbnail).map(row => [row.id, row.thumbnail]));
    for (const row of rows) {
      const definition = !row.invalid && workspace.library.find(item => item.id === row.id);
      if (definition) remember(row, JSON.stringify(definition));
    }
    saveStatus.value = 'global_saved';
    return workspace;
  }

  function schedule() {
    if (saveStatus.value === 'global_conflict') return;
    pending = true;
    saveStatus.value = 'saving';
    clearTimeout(timer);
    timer = setTimeout(flush, 800);
  }

  async function write() {
    const { upserts, removed } = globalChanges(document.value.library, saved);
    for (const { id, json } of upserts) {
      const definition = document.value.library.find(item => item.id === id);
      const entry = saved.get(id);
      const record = globalRecord(JSON.parse(json), zauxProjectVersion);
      const row = entry ? await updateGlobalComponent(record, entry.revision) : await createGlobalComponent(record, userId());
      if (!row) throw new Error(CONFLICT);
      if (definition) remember(row, json);
    }
    for (const id of removed) {
      const row = await archiveGlobalComponent(id, saved.get(id).revision);
      if (!row) throw new Error(CONFLICT);
      saved.set(id, { ...saved.get(id), revision: row.revision, archived: true });
    }
  }

  async function flush() {
    clearTimeout(timer);
    if (running) await running;
    if (!pending || saveStatus.value === 'global_conflict') return;
    pending = false;
    saveStatus.value = 'saving';
    running = (async () => {
      try {
        await write();
        saveStatus.value = pending ? 'saving' : 'global_saved';
      } catch (exception) {
        if (exception.message === CONFLICT) { saveStatus.value = 'global_conflict'; return; }
        pending = true;
        saveStatus.value = 'global_error';
        onError(exception);
      }
    })();
    try { await running; } finally { running = null; }
    if (pending && saveStatus.value === 'saving') schedule();
  }

  async function leave() {
    await flush();
    const ok = !pending && !['global_error', 'global_conflict'].includes(saveStatus.value);
    if (!ok) error.value ||= 'zx_builder_hub_leave_error';
    return ok;
  }

  // Unsaved edits ask the browser to confirm before closing the tab.
  function beforeUnload(event) {
    if (!pending && !running) return;
    flush();
    event.preventDefault();
    event.returnValue = '';
  }

  function dispose() { clearTimeout(timer); if (pending) flush(); }

  return { thumbnails, load, schedule, flush, leave, beforeUnload, dispose };
}
