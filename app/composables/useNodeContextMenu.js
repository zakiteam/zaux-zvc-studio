import { computed } from 'vue';
import { ancestorIds } from '../../domain/nodes.js';
import { nodeMenuShortcutLabel } from '../services/node-shortcuts.js';

// Right-click menu shared by the canvas and the outline. Right-click selects the target first,
// so items and actions read the current selection and reuse the builder's selection-based API.
// One instance lives in useBuilder (builder.nodeMenu); keyboard shortcuts run the same items.
export function useNodeContextMenu(builder) {
  const t = builder.translate;
  const target = computed(() => {
    const library = builder.mode.value === 'library';
    const instance = library ? null : builder.activeInstance.value;
    const definition = builder.activeDefinition.value;
    const node = builder.selectedNode.value;
    // The ZVC around the node: the library definition being edited, or the template instance (not free blocks).
    const zvc = !library && instance && instance.kind !== 'free' ? instance : null;
    const source = zvc ? builder.document.value.library.find(item => item.id === zvc.sourceId) : null;
    const parentId = node && definition ? ancestorIds(definition.tree, node.id)?.at(-1) ?? null : null;
    // The selected node is itself a ZVP reference: its captured copy and the library original.
    const partial = node ? builder.selectedPartial.value ?? null : null;
    const partialSource = partial ? builder.partialLibraryDefinition(partial) ?? null : null;
    // Library entry shown by "Show in library": the instance's ZVC, or the definition edited in library mode.
    const owner = zvc ? source : library ? builder.document.value.library.find(item => item.id === definition?.id) ?? null : null;
    return { library, instance, definition, node, zvc, source, owner, partial, partialSource, parentId, outlineId: library ? 'library' : instance?.id };
  });
  const items = computed(() => {
    const { library, definition, node, zvc, source, owner, partial, partialSource, parentId } = target.value;
    const editable = builder.canEditRemote.value;
    const copyable = builder.canCopyNode.value;
    const hasZvcParent = library ? !!definition : !!zvc;
    // Outline multi-selection: duplicate and delete apply to every selected row.
    const bulk = builder.outlineBulk.value;
    const count = builder.outlineSelection.value.length;
    // Single-target items (navigation, library, clipboard, new ZVC/ZVP, wrap, resets) would act only on
    // the last clicked row: hidden while several rows are selected, so the menu offers just bulk actions.
    const single = !bulk;
    const groups = [
      node && single ? [
        { id: 'select-zvc', icon: 'target', label: t('zx_builder_select_zvc_parent'), hidden: !hasZvcParent },
        { id: 'select-parent', icon: 'arrow-up', label: t('zx_builder_select_parent'), disabled: !parentId && !hasZvcParent },
      ] : [],
      node && single ? [
        { id: 'quick-style', icon: 'customize', label: t('zx_builder_quick_style'), disabled: !builder.canStyleNode.value || builder.nodeClasses.value === null },
      ] : [],
      partial && single ? [
        { id: 'edit-zvp-library', icon: 'enter', label: t(partialSource?.global ? 'zx_builder_global_edit' : 'zx_builder_edit_zvp_library'), hidden: !partialSource },
        { id: 'reveal-zvp', icon: 'search', label: t('zx_builder_reveal_zvp_library'), hidden: !partialSource },
        { id: 'reset-zvp-hard', icon: 'loop', label: t('zx_builder_reset_zvp_hard'), disabled: !editable || builder.isSource.value || !partialSource, danger: true },
        { id: 'reset-zvp-soft', icon: 'refresh', label: t('zx_builder_reset_zvp_soft'), disabled: !editable || builder.isSource.value || !partialSource },
      ] : [],
      zvc && single ? [
        { id: 'edit-library', icon: 'enter', label: t(source?.global ? 'zx_builder_global_edit' : 'zx_builder_edit_zvc_library'), hidden: !source },
        { id: 'reveal-owner', icon: 'search', label: t('zx_builder_reveal_zvc_library'), hidden: !owner },
        { id: 'rename', icon: 'edit', label: t('zx_builder_rename'), hidden: !!node, disabled: !editable },
        { id: 'reset-hard', icon: 'loop', label: t('zx_builder_reset_zvc_hard'), disabled: !editable || !source, danger: true },
        { id: 'reset-soft', icon: 'refresh', label: t('zx_builder_reset_zvc_soft'), disabled: !editable || !source },
        { id: 'detach', icon: 'hyperlink-remove', label: t('zx_builder_detach_instance'), disabled: !editable || !!zvc.definition.sourceKey || !zvc.definition.tree.length },
      ] : [],
      // Library mode: the edited ZVC/ZVP itself.
      library && owner ? [
        { id: 'reveal-owner', icon: 'search', label: t(owner.kind === 'zvp' ? 'zx_builder_reveal_zvp_library' : 'zx_builder_reveal_zvc_library') },
      ] : [],
      node && single ? [
        { id: 'copy-node', icon: 'copy', label: t('zx_builder_copy_node'), disabled: !copyable },
        { id: 'paste-node', icon: 'document-add', label: t('zx_builder_paste_node'), disabled: !builder.canPasteNode.value },
        { id: 'duplicate-node', icon: 'duplicate', label: t('zx_builder_duplicate_node'), disabled: !copyable || !editable },
        { id: 'new-zvc', icon: 'element-add', label: t('zx_builder_new_zvc_from_node'), disabled: !copyable || !editable },
        { id: 'new-zvp', icon: 'listing-add', label: t('zx_builder_new_zvp_from_node'), disabled: !copyable || !editable },
        { id: 'wrap', icon: 'selection', label: t('zx_builder_wrap_div'), disabled: !copyable || !editable },
        { id: 'delete-node', icon: 'delete', label: t('zx_builder_delete_node'), disabled: !copyable || !editable, danger: true },
      ] : [],
      bulk ? [
        { id: 'copy-node', icon: 'copy', label: t('zx_builder_copy_selection', { count }), disabled: !copyable },
        { id: 'paste-node', icon: 'document-add', label: t('zx_builder_paste_node'), disabled: !builder.canPasteNode.value },
        { id: 'duplicate-node', icon: 'duplicate', label: t('zx_builder_duplicate_selection', { count }), disabled: !editable },
        { id: 'delete-node', icon: 'delete', label: t('zx_builder_delete_selection', { count }), disabled: !editable, danger: true },
        { id: 'group-zvc', icon: 'element-add', label: t('zx_builder_group_zvc'), hidden: !builder.outlineGroupRange.value, disabled: !editable },
      ] : [],
      // Export reads the edited ZVC (library) or the active instance (template): one target only.
      library || single ? [
        { id: 'export-runtime', icon: 'download', label: t('zx_builder_export_zaux_json'), disabled: !definition },
        { id: 'export-js', icon: 'download', label: t('zx_builder_export_component_js'), disabled: !definition },
      ] : [],
    ];
    // A separator line opens every group after the first visible one.
    return groups
      .map(group => group.filter(item => !item.hidden))
      .filter(group => group.length)
      .flatMap((group, index) => group.map((item, position) => ({
        ...item,
        ...(index && !position ? { separator: true } : {}),
        shortcut: nodeMenuShortcutLabel(item.id),
        ariaShortcut: nodeMenuShortcutLabel(item.id, { aria: true }),
      })));
  });
  function select(nodeId) {
    const { outlineId } = target.value;
    builder.selectInstance(outlineId, nodeId);
    builder.revealOutline(outlineId, nodeId);
  }
  function reset(mode) {
    const { zvc, source } = target.value;
    // Instances of a global component reset through the global dialog, which can first pull its latest revision.
    if (source?.global) builder.requestGlobalSync(zvc.sourceId, { instance: zvc.id, reset: mode });
    else if (mode === 'soft') builder.restoreActiveInstance();
    else builder.resetInstance(zvc.id);
  }
  // anchor: viewport rectangle of the menu that ran the item (BuilderDropdown select), for inline editors.
  function run(item, anchor = null) {
    const { node, zvc, parentId } = target.value;
    if (item.id === 'quick-style') builder.openQuickStyle(anchor);
    if (item.id === 'select-zvc') select(null);
    if (item.id === 'select-parent') select(parentId);
    if (item.id === 'edit-library') builder.selectLibrary(zvc.sourceId);
    if (item.id === 'reveal-zvp') builder.revealInLibrary(target.value.partialSource.id);
    if (item.id === 'reveal-owner') builder.revealInLibrary(target.value.owner.id);
    if (item.id === 'edit-zvp-library') builder.selectLibrary(target.value.partialSource.id);
    if (item.id === 'reset-zvp-hard') builder.restorePartialReference(node, { hard: true });
    if (item.id === 'reset-zvp-soft') builder.restorePartialReference(node);
    if (item.id === 'rename') builder.modal.value = { type: 'rename', kind: 'instance', id: zvc.id, name: zvc.name };
    if (item.id === 'reset-hard') reset('hard');
    if (item.id === 'reset-soft') reset('soft');
    if (item.id === 'detach') builder.detachInstance(zvc.id);
    if (item.id === 'copy-node') builder.copySelectedNode();
    if (item.id === 'paste-node') builder.pasteNode();
    if (item.id === 'duplicate-node') builder.outlineBulk.value ? builder.duplicateOutlineSelection() : builder.duplicateNode();
    if (item.id === 'new-zvc' || item.id === 'new-zvp') builder.modal.value = { type: item.id + '-from-node', name: node.name };
    if (item.id === 'wrap') builder.wrapNode();
    if (item.id === 'group-zvc') builder.modal.value = { type: 'group-zvc', ...builder.outlineGroupRange.value };
    if (item.id === 'delete-node') builder.outlineBulk.value ? builder.deleteOutlineSelection() : builder.deleteNode();
    if (item.id === 'export-runtime') builder.openExport({ scope: 'component', format: 'runtime' });
    if (item.id === 'export-js') builder.openExport({ scope: 'component', format: 'js' });
  }
  // Keyboard path: runs the action only when the menu would offer it enabled for the current selection.
  function runShortcut(id) {
    const item = items.value.find(entry => entry.id === id);
    if (!item || item.disabled) return false;
    run(item);
    return true;
  }
  return { items, run, runShortcut };
}
