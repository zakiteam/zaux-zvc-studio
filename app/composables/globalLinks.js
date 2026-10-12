import { computed, ref } from 'vue';
import { createInstance } from '../../domain/workspace.js';
import { uid } from '../../domain/nodes.js';
import { restoreInstance } from '../../domain/restore-instance.js';
import { syncLibraryInstances, resetLibraryInstances } from '../../domain/sync-instances.js';
import { globalMeta, globalUpdateAvailable, globalVersionCheck, isGlobalCandidate, linkGlobalComponent, publishRecord } from '../../domain/global-components.js';
import { createGlobalComponent, listGlobalComponents } from '../services/global-components.js';
import { zauxProjectVersion } from '../../integrations/zaux/version.js';

// Project side of the global library: catalog, import of linked copies after the Zaux version
// check, explicit Soft/Hard reset of their instances (optionally pulling the latest revision) and
// publication of project components as new global ones.
// Global components are never edited in place: editing opens the isolated Component designer.
export function createGlobalLinks({ document, commit, error, modal, canEditRemote, instanceId, nodeId, insertInstance, insertPartial, dropElement, userId }) {
  const globalCatalog = ref([]);
  const globalCatalogStatus = ref('idle');
  let loading = null;

  async function loadGlobalCatalog(force = false) {
    if (loading) return loading;
    if (globalCatalogStatus.value === 'ready' && !force) return;
    globalCatalogStatus.value = 'loading';
    loading = listGlobalComponents({ thumbnails: true })
      .then(rows => { globalCatalog.value = rows; globalCatalogStatus.value = 'ready'; })
      .catch(() => { globalCatalogStatus.value = 'error'; })
      .finally(() => { loading = null; });
    return loading;
  }

  // Global signatures are compared with the running builder and the project's last-edit release.
  function versionCheck(signed) { return globalVersionCheck(signed, zauxProjectVersion, document.value.zauxEditedVersion); }
  // Linked copies approved in this session, by id and signature, insert without asking again.
  const acceptedLinked = new Set();
  function linkedApproved(definition) {
    return versionCheck(definition.global.zauxVersion).match || acceptedLinked.has(definition.id + '|' + definition.global.zauxVersion);
  }

  // Catalog rows merged with the linked copies (a copy whose global was archived stays listed).
  const globalEntries = computed(() => {
    const linked = new Map(document.value.library.filter(item => item.global).map(item => [item.id, item]));
    const entries = globalCatalog.value.map(row => {
      const definition = linked.get(row.id) ?? null;
      linked.delete(row.id);
      return {
        id: row.id, name: row.name, kind: row.kind, exportName: definition?.exportName ?? row.export_name,
        zauxVersion: row.zaux_version, revision: row.revision, thumbnail: row.thumbnail ?? '', updatedAt: row.updated_at,
        definition, available: true, updateAvailable: globalUpdateAvailable(definition, row),
        compatible: versionCheck(row.zaux_version).match
      };
    });
    for (const definition of linked.values()) {
      entries.push({
        id: definition.id, name: definition.name, kind: definition.kind ?? 'zvc', exportName: definition.exportName,
        zauxVersion: definition.global.zauxVersion, revision: definition.global.revision, thumbnail: definition.previewImage ?? '',
        updatedAt: definition.global.updatedAt, definition, available: globalCatalogStatus.value !== 'ready', updateAvailable: false,
        compatible: versionCheck(definition.global.zauxVersion).match
      });
    }
    return entries;
  });

  function openGlobalDesigner(id) {
    window.open('/designer' + (id ? '?component=' + encodeURIComponent(id) : ''), '_blank', 'noopener');
  }

  function insertLinked(definition) {
    if (definition.kind === 'zvp') insertPartial(definition.id);
    else insertInstance(definition.id);
  }
  // Drop of a linked copy at { nodeId, position, instanceId }, through the ordinary library/palette drop.
  function dropLinked(definition, target) {
    const payload = definition.kind === 'zvp' ? { kind: 'catalog', name: definition.exportName } : { kind: 'library', id: definition.id };
    dropElement(payload, target.nodeId, target.position, target.instanceId);
  }
  function dropGlobal(id, target) {
    if (!canEditRemote.value) return;
    const linked = document.value.library.find(item => item.id === id && item.global);
    if (linked && linkedApproved(linked)) dropLinked(linked, target);
    else if (linked) modal.value = { type: 'zaux-version', scope: 'global', id, insert: target };
    else modal.value = { type: 'global-import', id, insert: target };
  }
  // Linked components with a matching signature insert directly; the others ask for approval first.
  // New ones go through the import dialog, which has its own version check.
  function insertGlobal(id) {
    if (!canEditRemote.value) return;
    const linked = document.value.library.find(item => item.id === id && item.global);
    if (linked && linkedApproved(linked)) insertLinked(linked);
    else if (linked) modal.value = { type: 'zaux-version', scope: 'global', id, insert: true };
    else modal.value = { type: 'global-import', id, insert: true };
  }
  // Called by the version dialog after explicit approval; `insert` is true or a captured drop target.
  function insertApprovedGlobal(id, insert) {
    const linked = document.value.library.find(item => item.id === id && item.global);
    if (!linked || !canEditRemote.value) return false;
    acceptedLinked.add(linked.id + '|' + linked.global.zauxVersion);
    modal.value = null;
    if (insert && typeof insert === 'object') dropLinked(linked, insert);
    else insertLinked(linked);
    return !error.value;
  }
  function requestGlobalImport(id, insert = false) { if (canEditRemote.value) modal.value = { type: 'global-import', id, insert }; }

  // Called by the dialog after explicit approval. `row` is the latest database row with definition.
  function importGlobalComponent(row, { insert = false } = {}) {
    let definition;
    commit(workspace => { definition = linkGlobalComponent(workspace, row); });
    if (error.value) return false;
    // The dialog already approved this signature.
    acceptedLinked.add(row.id + '|' + row.zaux_version);
    const index = globalCatalog.value.findIndex(item => item.id === row.id);
    if (index >= 0) globalCatalog.value[index] = { ...globalCatalog.value[index], ...row, definition: undefined };
    // insert: true appends to the template; an object is the drop target captured before the dialog.
    const linked = document.value.library.find(item => item.id === definition.id);
    if (insert && typeof insert === 'object') dropLinked(linked, insert);
    else if (insert) insertLinked(linked);
    // The copy is linked even when the insertion fails; report the insertion error to the dialog.
    if (insert && error.value) return false;
    return true;
  }

  // Project ZVC/ZVP → new global row (dialog { type: 'global-publish', id }). With link the project
  // definition becomes the linked copy of that row (same id), so its instances and ZVP references stay
  // valid and later changes come from the Component designer; without link only a copy is published.
  function requestGlobalPublish(id) {
    const definition = document.value.library.find(item => item.id === id);
    if (canEditRemote.value && isGlobalCandidate(definition)) modal.value = { type: 'global-publish', id };
  }
  async function publishGlobalComponent(id, { link = true, rows = null } = {}) {
    const definition = document.value.library.find(item => item.id === id);
    if (!canEditRemote.value) throw new Error('zx_builder_project_readonly');
    if (!isGlobalCandidate(definition)) throw new Error('zx_builder_global_publish_invalid');
    const record = publishRecord(definition, rows ?? await listGlobalComponents(), { id: link ? definition.id : uid(), zauxVersion: zauxProjectVersion });
    const row = await createGlobalComponent(record, userId());
    globalCatalog.value = [...globalCatalog.value.filter(item => item.id !== row.id), { ...row, thumbnail: null }];
    if (!link) return { row, linked: false };
    commit(workspace => {
      const current = workspace.library.find(item => item.id === id);
      if (!current || current.global) throw new Error('zx_builder_global_missing');
      current.global = globalMeta(row);
    });
    // The row exists even when linking fails (the project changed meanwhile): report it, keep the row.
    if (error.value) throw new Error('zx_builder_global_publish_link_error');
    acceptedLinked.add(row.id + '|' + row.zaux_version);
    return { row, linked: true };
  }

  // reset: 'soft' | 'hard' | 'none'. With instanceId only that instance is reset; otherwise every copy.
  function requestGlobalSync(id, { instance = null, reset = 'soft' } = {}) {
    if (canEditRemote.value) modal.value = { type: 'global-sync', id, instanceId: instance, reset };
  }
  function syncGlobalComponent(id, { row = null, instance = null, reset = 'soft' } = {}) {
    let replaced = {};
    commit(workspace => {
      const linked = row ? linkGlobalComponent(workspace, row) : workspace.library.find(item => item.id === id && item.global);
      if (!linked) throw new Error('zx_builder_global_missing');
      if (instance) {
        for (const template of workspace.templates) {
          const index = template.instances.findIndex(item => item.id === instance && item.sourceId === linked.id);
          if (index < 0) continue;
          if (reset === 'hard') {
            const fresh = createInstance(linked);
            replaced[template.instances[index].id] = fresh.id;
            template.instances.splice(index, 1, fresh);
          } else if (reset === 'soft') Object.assign(template.instances[index], restoreInstance(template.instances[index], linked));
        }
      } else if (reset === 'soft') syncLibraryInstances(workspace, linked);
      else if (reset === 'hard') replaced = resetLibraryInstances(workspace, linked);
    });
    if (error.value) return false;
    if (replaced[instanceId.value]) { instanceId.value = replaced[instanceId.value]; nodeId.value = null; }
    if (row) {
      acceptedLinked.add(row.id + '|' + row.zaux_version);
      const index = globalCatalog.value.findIndex(item => item.id === row.id);
      if (index >= 0) globalCatalog.value[index] = { ...globalCatalog.value[index], ...row, definition: undefined };
    }
    return true;
  }

  return {
    globalCatalog, globalCatalogStatus, globalEntries, loadGlobalCatalog, openGlobalDesigner, insertGlobal, dropGlobal,
    insertApprovedGlobal, globalVersionCheck: versionCheck, requestGlobalImport, importGlobalComponent, requestGlobalSync, syncGlobalComponent,
    requestGlobalPublish, publishGlobalComponent
  };
}
