<template>
  <div class="zb-canvas-area relative flex min-h-0 flex-1 flex-col" :style="{ backgroundColor: canvasDark ? '#18181b' : '#e4e4e7' }">
    <slot name="toolbar" />
    <div ref="stage" class="zb-canvas-stage zb-scroll min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-2 pb-2">
      <div class="zb-canvas-frame mx-auto" :style="{ width: `${layout.width * layout.scale}px` }">
        <div class="zb-canvas-label flex h-[22px] items-end justify-between gap-2 pb-0.5 font-mono text-[10px]" :style="{ color: canvasDark ? '#a1a1aa' : '#52525b' }">
          <span class="truncate">{{ viewportLabel }}</span>
          <span class="shrink-0">{{ Math.round(layout.scale * 100) }}%</span>
        </div>
        <div class="relative" :style="{ height: `${layout.height * layout.scale}px` }">
          <div class="zb-preview-frame absolute left-0 top-0 origin-top-left overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white shadow-deep [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-none"
            :style="{ width: `${layout.width}px`, height: `${layout.height}px`, transform: layout.scale === 1 ? null : `scale(${layout.scale})` }">
            <iframe ref="frame" src="/preview" :style="{ backgroundColor: canvasDark ? '#18181b' : '#ffffff' }" :title="translate('zx_builder_preview_title')" @load="sendState(); sendInspect()" />
          </div>
        </div>
      </div>
    </div>
    <!-- Canvas right-click menu: the iframe forwards the point, the menu renders in the editor document. -->
    <BuilderDropdown ref="contextMenu" context-menu content-class="!w-max !max-w-max !pb-1"
      :label="translate('zx_builder_canvas_actions')" :items="contextItems" @select="contextAction">
      <template #trigger><span aria-hidden="true" /></template>
    </BuilderDropdown>
  </div>
</template>
<script>
import { computed, defineComponent, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { runtimeNodes } from '../../../domain/nodes.js';
import { componentThemesCss } from '../../../domain/component-themes.js';
import { useBuilder } from '../../composables/useBuilder.js';
export default defineComponent({
  setup() {
    const builder = useBuilder();
    const frame = ref(null);
    const stage = ref(null);
    const contextMenu = ref(null);
    const contextItems = computed(() => [
      { id: 'edit-library', icon: 'enter', label: builder.translate('zx_builder_edit_library'), hidden: builder.mode.value !== 'template', disabled: !builder.instanceLibraryDefinition.value },
      { id: 'export-runtime', icon: 'download', label: builder.translate('zx_builder_export_zaux_json'), disabled: !builder.activeDefinition.value },
      { id: 'export-js', icon: 'download', label: builder.translate('zx_builder_export_component_js'), disabled: !builder.activeDefinition.value },
    ]);
    function contextAction(item) {
      if (item.id === 'edit-library') builder.selectLibrary(builder.instanceLibraryDefinition.value.id);
      if (item.id === 'export-runtime') builder.openExport({ scope: 'component', format: 'runtime' });
      if (item.id === 'export-js') builder.openExport({ scope: 'component', format: 'js' });
    }
    // Iframe coordinates are scaled by the canvas zoom; the frame rectangle already includes it.
    function openContextMenu({ x, y }) {
      const rect = frame.value?.getBoundingClientRect();
      if (rect && Number.isFinite(x) && Number.isFinite(y)) contextMenu.value?.openAt(rect.left + x * layout.value.scale, rect.top + y * layout.value.scale);
    }
    const stageSize = ref({ width: 0, height: 0 });
    let stageObserver;
    // Frame keeps its nominal viewport width; zoom only scales it visually inside the stage.
    const layout = computed(() => {
      const { width, height } = stageSize.value;
      // The frame always fits the stage height, so the stage never needs a vertical scrollbar:
      // a scrollbar would change the width, the fit scale and the toolbar wrapping, in a loop.
      const availableWidth = Math.max(240, width - 32);
      const availableHeight = Math.max(120, height - 22 - 16);
      const nominal = builder.viewportWidth.value;
      const zoom = builder.canvasZoom.value;
      // Round down so the scaled frame never exceeds the stage by a sub-pixel.
      const scale = zoom === 'fit' ? (nominal ? Math.min(1, Math.floor(availableWidth / nominal * 1000) / 1000) : 1) : zoom;
      return { scale, width: Math.floor(nominal ?? availableWidth / scale), height: Math.floor(availableHeight / scale) };
    });
    watch(() => layout.value.scale, scale => { builder.canvasScale.value = scale; }, { immediate: true });
    const dynamicCss = ref('');
    let timer;
    let generation = 0;
    let visibilityRequest = 0;
    function sendState() {
      frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'state', outlineVisibilityRequest: ++visibilityRequest, instances: JSON.parse(JSON.stringify(builder.previewInstances.value)), selectedNodeId: builder.nodeId.value, selectedInstanceId: builder.mode.value === 'library' ? 'library' : builder.instanceId.value, editable: !builder.previewOnly.value, canCopyNode: builder.canCopyNode.value, canPasteNode: builder.canPasteNode.value, canDuplicateNode: builder.canCopyNode.value && builder.canEditRemote.value, canDeleteNode: builder.canCopyNode.value && builder.canEditRemote.value, canvasDark: builder.canvasDark.value, language: builder.language.value, css: dynamicCss.value, themeCss: componentThemesCss(builder.document.value.componentThemes), styles: JSON.parse(JSON.stringify(builder.document.value.styles)) }, window.location.origin);
    }
    // Lightweight message: hover-driven highlightNodeCSS calls must not resend the whole state.
    function sendInspect() {
      frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'css-inspect', enabled: builder.cssInspect.value, properties: [...builder.cssInspectProperties.value], highlight: builder.cssHighlight.value ? JSON.parse(JSON.stringify(builder.cssHighlight.value)) : null }, window.location.origin);
    }
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.value?.contentWindow || event.data?.channel !== 'zaux-studio') return;
      const message = event.data;
      if (message.type === 'undo' || message.type === 'redo') {
        if (!builder.previewOnly.value && !builder.modal.value && builder.canEditRemote.value) {
          if (message.type === 'undo') builder.undo();
          else builder.redo();
        }
        return;
      }
      if (message.type === 'outline-visibility' && message.request === visibilityRequest && Array.isArray(message.hidden)) {
        builder.hiddenOutlineNodes.value = new Set(message.hidden);
      }
      if (!builder.previewOnly.value && message.instanceId === (builder.mode.value === 'library' ? 'library' : builder.instanceId.value) && message.nodeId === builder.nodeId.value) {
        if (message.type === 'copy-node') builder.copySelectedNode();
        if (message.type === 'cut-node') builder.cutSelectedNode();
        if (message.type === 'paste-node') builder.pasteNode();
        if (message.type === 'duplicate-node') builder.duplicateNode();
        if (message.type === 'delete-node') builder.deleteNode();
      }
      if (message.type === 'layout') { if (!builder.modal.value) builder.runLayoutShortcut(message.action); return; }
      if (message.type === 'ready') { sendState(); sendInspect(); }
      if (message.type === 'context-menu') { if (!builder.previewOnly.value && !builder.modal.value) openContextMenu(message); return; }
      if (message.type === 'select') {
        // A click inside the iframe never reaches this document's pointer listeners.
        contextMenu.value?.close();
        builder.selectInstance(message.instanceId, message.nodeId);
        if (message.revealOutline) builder.revealOutline(message.instanceId, message.nodeId);
      }
      if (message.type === 'drop' && !builder.previewOnly.value) builder.dropElement(message.payload, message.nodeId, message.position, message.instanceId);
    }
    async function compileCss() {
      const token = ++generation;
      try {
        const result = await $fetch('/api/preview-css', { method: 'POST', body: { content: JSON.stringify({ rendered: builder.previewInstances.value.map(instance => runtimeNodes(instance.definition, instance.data)), instances: builder.previewInstances.value, uiSettings: builder.document.value.styles.uiSettings }) } });
        if (token === generation) { dynamicCss.value = result.css; sendState(); }
      } catch { if (token === generation) builder.error.value = 'zx_builder_css_error'; }
    }
    watch([() => builder.document.value.componentThemes, builder.previewInstances, builder.nodeId, builder.instanceId, builder.previewOnly, builder.canCopyNode, builder.canPasteNode, builder.canEditRemote, builder.canvasDark, builder.language, () => builder.document.value.styles], sendState, { deep: true });
    watch([builder.previewInstances, () => builder.document.value.styles.uiSettings], () => { clearTimeout(timer); timer = setTimeout(compileCss, 450); }, { deep: true });
    watch([builder.cssInspect, builder.cssInspectProperties, builder.cssHighlight], sendInspect, { deep: true });
    watch(() => builder.revealTarget.value, (target) => {
      if (!target) return;
      frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'reveal', instanceId: target.instanceId, nodeId: target.nodeId }, window.location.origin);
    });
    watch([builder.mode, builder.libraryId, builder.templateId, builder.viewportWidth], () => { builder.hiddenOutlineNodes.value = new Set(); sendState(); });
    onMounted(() => {
      window.addEventListener('message', receive); compileCss();
      stageObserver = new ResizeObserver(([entry]) => {
        stageSize.value = { width: entry.target.clientWidth, height: entry.target.clientHeight };
      });
      stageObserver.observe(stage.value);
    });
    onBeforeUnmount(() => { stageObserver?.disconnect(); builder.hiddenOutlineNodes.value = new Set(); window.removeEventListener('message', receive); clearTimeout(timer); generation++; });
    return { ...builder, frame, stage, layout, sendState, sendInspect, contextMenu, contextItems, contextAction };
  }
});
</script>
