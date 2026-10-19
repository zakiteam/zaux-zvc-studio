<template>
  <div class="zb-canvas-area relative flex min-h-0 flex-1 flex-col" :style="{ backgroundColor: canvasDark ? '#18181b' : '#e4e4e7' }">
    <slot name="toolbar" />
    <div ref="stage" class="zb-canvas-stage zb-scroll min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-2 pb-2">
      <div class="zb-canvas-frame mx-auto" :style="{ width: `${layout.width * layout.scale}px` }">
        <div class="zb-canvas-label flex h-[22px] items-end justify-between gap-2 pb-0.5 font-mono text-[10px]" :style="{ color: canvasDark ? '#a1a1aa' : '#52525b' }">
          <span class="truncate" :class="{ 'font-semibold': resizing }">{{ viewportLabel }}</span>
          <span class="shrink-0">{{ Math.round(layout.scale * 100) }}%</span>
        </div>
        <div class="relative" :style="{ height: `${layout.height * layout.scale}px` }">
          <!-- Resize handles: dragging or arrow keys move between the breakpoints of the active viewport mode. -->
          <template v-if="viewportResizeHandles">
            <div v-for="side in [-1, 1]" :key="side" role="slider" tabindex="0"
              class="zb-canvas-resize group absolute top-0 z-[1] flex h-full w-[14px] cursor-ew-resize touch-none items-center justify-center outline-none"
              :class="side < 0 ? 'right-full mr-[2px]' : 'left-full ml-[2px]'"
              :aria-label="translate(side < 0 ? 'zx_builder_viewport_resize_start' : 'zx_builder_viewport_resize_end')"
              aria-orientation="horizontal" :aria-valuemin="0" :aria-valuemax="viewportSteps.length - 1"
              :aria-valuenow="stepIndex" :aria-valuetext="viewportLabel" :title="translate('zx_builder_viewport_resize_hint')"
              @pointerdown="startResize($event, side)" @pointermove="moveResize" @pointerup="endResize" @pointercancel="endResize"
              @lostpointercapture="endResize" @keydown="resizeKey($event, side)">
              <span aria-hidden="true" class="h-[48px] w-[4px] rounded-xxs transition-colors group-focus-visible:ring-2 group-focus-visible:ring-zaux-accent"
                :class="resizing ? 'bg-zaux-accent' : canvasDark ? 'bg-[#71717a] group-hover:bg-[#d4d4d8]' : 'bg-[#a1a1aa] group-hover:bg-[#3f3f46]'" />
            </div>
          </template>
          <div class="zb-preview-frame absolute left-0 top-0 origin-top-left overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white shadow-deep [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-none"
            :class="{ '[&>iframe]:pointer-events-none': resizing }"
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
import { workspaceThemeCss } from '../../../domain/component-themes.js';
import { useBuilder } from '../../composables/useBuilder.js';
export default defineComponent({
  setup() {
    const builder = useBuilder();
    const frame = ref(null);
    const stage = ref(null);
    const contextMenu = ref(null);
    const { items: contextItems, run: contextAction } = builder.nodeMenu;
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
    const stepIndex = computed(() => builder.viewportSteps.value.findIndex(step => step.value === builder.viewportStep.value));
    // The frame is centred, so both edges move: the pointer travels half the width change, in screen pixels.
    const resizing = ref(false);
    let resizeStart = null;
    function startResize(event, side) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeStart = { x: event.clientX, side, width: layout.value.width, scale: layout.value.scale };
      resizing.value = true;
    }
    function moveResize(event) {
      if (!resizeStart) return;
      const { x, side, width, scale } = resizeStart;
      const target = width + side * 2 * (event.clientX - x) / scale;
      const steps = builder.viewportSteps.value;
      const widest = steps.at(-2)?.width ?? 0;
      // Automatic is reachable past the widest breakpoint even when the stage is narrower than it.
      const autoWidth = Math.max(Math.floor(Math.max(240, stageSize.value.width - 32) / scale), widest + 160);
      const nearest = steps.reduce((best, step) => Math.abs((step.width ?? autoWidth) - target) < Math.abs((best.width ?? autoWidth) - target) ? step : best);
      if (nearest.value !== builder.viewportStep.value) builder.viewportStep.value = nearest.value;
    }
    function endResize() {
      resizeStart = null;
      resizing.value = false;
    }
    // Arrow keys follow the handle side: pushing outward widens, Home/End jump to the extremes.
    function resizeKey(event, side) {
      const steps = builder.viewportSteps.value;
      const delta = { ArrowLeft: -side, ArrowRight: side, ArrowUp: 1, ArrowDown: -1 }[event.key];
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1
        : delta ? Math.min(steps.length - 1, Math.max(0, (stepIndex.value < 0 ? steps.length - 1 : stepIndex.value) + delta)) : null;
      if (index === null) return;
      event.preventDefault();
      builder.viewportStep.value = steps[index].value;
    }
    const dynamicCss = ref('');
    // Runtime CSS per entity: a tab switch sends the last compiled CSS at once instead of re-laying out later.
    const cssCache = new Map();
    let cssKey = null;
    let timer;
    let generation = 0;
    let visibilityRequest = 0;
    // The preview restores this offset only when the key changes, so tab switches keep each entity's scroll.
    const scrollKey = () => builder.mode.value === 'library' ? `library:${builder.libraryId.value}` : `template:${builder.templateId.value}`;
    function sendState() {
      const key = scrollKey();
      const css = cssKey === key ? dynamicCss.value : cssCache.get(key) ?? dynamicCss.value;
      frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'state', scrollKey: key, scrollY: builder.previewScroll.get(key) ?? 0, cssPending: cssKey !== key && !cssCache.has(key), outlineVisibilityRequest: ++visibilityRequest, instances: JSON.parse(JSON.stringify(builder.previewInstances.value)), selectedNodeId: builder.nodeId.value, selectedInstanceId: builder.mode.value === 'library' ? 'library' : builder.instanceId.value, selectedRows: builder.outlineBulk.value ? JSON.parse(JSON.stringify(builder.outlineSelection.value)) : [], editable: !builder.previewOnly.value, readonly: builder.workspaceView.value === 'dev', canCopyNode: builder.canCopyNode.value && builder.workspaceView.value !== 'dev', canPasteNode: builder.canPasteNode.value && builder.workspaceView.value !== 'dev', canDuplicateNode: (builder.outlineBulk.value || builder.canCopyNode.value) && builder.canEditRemote.value, canDeleteNode: (builder.outlineBulk.value || builder.canCopyNode.value) && builder.canEditRemote.value, canvasDark: builder.canvasDark.value, language: builder.language.value, css, themeCss: workspaceThemeCss(builder.document.value), styles: JSON.parse(JSON.stringify(builder.document.value.styles)) }, window.location.origin);
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
      if (message.type === 'scroll') {
        if (typeof message.key === 'string' && Number.isFinite(message.y)) builder.previewScroll.set(message.key, message.y);
        return;
      }
      if (message.type === 'outline-visibility' && message.request === visibilityRequest && Array.isArray(message.hidden)) {
        builder.hiddenOutlineNodes.value = new Set(message.hidden);
      }
      if (!builder.previewOnly.value && message.instanceId === (builder.mode.value === 'library' ? 'library' : builder.instanceId.value) && message.nodeId === builder.nodeId.value) {
        // Dev mode is read-only: clipboard and structure actions are ignored there.
        const editing = builder.workspaceView.value !== 'dev';
        if (editing && message.type === 'copy-node') builder.copySelectedNode();
        if (editing && message.type === 'cut-node') builder.cutSelectedNode();
        if (editing && message.type === 'paste-node') builder.pasteNode();
        // With a multi-selection, duplicate and delete act on every selected row.
        if (editing && message.type === 'duplicate-node') builder.outlineBulk.value ? builder.duplicateOutlineSelection() : builder.duplicateNode();
        if (editing && message.type === 'delete-node') builder.outlineBulk.value ? builder.deleteOutlineSelection() : builder.deleteNode();
        if (message.type === 'node-menu' && !builder.modal.value) builder.nodeMenu.runShortcut(message.action);
        if (message.type === 'deselect-node' && !builder.modal.value) builder.deselectNode();
      }
      if (message.type === 'layout') { if (!builder.modal.value) builder.runLayoutShortcut(message.action); return; }
      if (message.type === 'ready') { sendState(); sendInspect(); }
      if (message.type === 'context-menu') { if (!builder.previewOnly.value && !builder.modal.value) openContextMenu(message); return; }
      if (message.type === 'select') {
        // A click inside the iframe never reaches this document's pointer listeners.
        contextMenu.value?.close();
        // Shift+click toggles the row in the multi-selection; right-click keeps the selection it lands in.
        if (message.toggle && !builder.previewOnly.value) { builder.toggleOutlineRow(message.instanceId, message.nodeId); return; }
        if (message.preserve) builder.selectOutlineRow(message.instanceId, message.nodeId, false, true);
        else builder.selectInstance(message.instanceId, message.nodeId);
        if (message.revealOutline) builder.revealOutline(message.instanceId, message.nodeId);
      }
      if (message.type === 'drop' && !builder.previewOnly.value && builder.canEditRemote.value) {
        // Dragging a node of the multi-selection moves the whole selection, as in the outline.
        const payload = message.payload?.kind === 'node' && builder.inOutlineBulk(message.payload.instanceId, message.payload.id)
          ? builder.outlineDragPayload(message.payload) : message.payload;
        builder.dropElement(payload, message.nodeId, message.position, message.instanceId);
      }
    }
    async function compileCss() {
      const token = ++generation;
      const key = scrollKey();
      try {
        const result = await $fetch('/api/preview-css', { method: 'POST', body: { content: JSON.stringify({ rendered: builder.previewInstances.value.map(instance => runtimeNodes(instance.definition, instance.data)), instances: builder.previewInstances.value, uiSettings: builder.document.value.styles.uiSettings }) } });
        if (token === generation) { dynamicCss.value = result.css; cssKey = key; cssCache.set(key, result.css); sendState(); }
      } catch { if (token === generation) builder.error.value = 'zx_builder_css_error'; }
    }
    watch([() => builder.document.value.componentThemes, () => builder.document.value.projectStyles, builder.previewInstances, builder.nodeId, builder.instanceId, builder.outlineSelection, builder.previewOnly, builder.canCopyNode, builder.canPasteNode, builder.canEditRemote, builder.workspaceView, builder.canvasDark, builder.language, () => builder.document.value.styles], sendState, { deep: true });
    watch([builder.previewInstances, () => builder.document.value.styles.uiSettings], () => { clearTimeout(timer); timer = setTimeout(compileCss, scrollKey() === cssKey ? 450 : 0); }, { deep: true });
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
    return { ...builder, frame, stage, layout, stepIndex, resizing, startResize, moveResize, endResize, resizeKey, sendState, sendInspect, contextMenu, contextItems, contextAction };
  }
});
</script>
