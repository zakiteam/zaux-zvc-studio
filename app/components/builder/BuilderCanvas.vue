<template>
  <div class="zb-canvas-area flex min-h-0 flex-1 flex-col items-center overflow-auto px-1 pb-1 max-[1200px]:p-2" :style="{ backgroundColor: canvasDark ? '#18181b' : '#e4e4e7' }">
    <div class="zb-canvas-ruler h-[22px] w-full shrink-0 text-center [&>span]:font-mono [&>span]:text-[9px] [&>span]:tracking-[1px] [&>span]:text-zaux-dark-grey"><span :style="{ color: canvasDark ? '#d4d4d8' : '#52525b' }">{{ viewportLabel }}</span></div>
    <div class="zb-preview-frame min-h-[450px] w-full flex-1 overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white shadow-deep transition-[width] [&>iframe]:block [&>iframe]:h-full [&>iframe]:min-h-[450px] [&>iframe]:w-full [&>iframe]:border-none" :style="viewportWidth === null ? {} : { width: `${viewportWidth}px`, minWidth: `${viewportWidth}px`, boxSizing: 'content-box', alignSelf: 'flex-start', marginInline: 'auto' }">
      <iframe ref="frame" src="/preview" :style="{ backgroundColor: canvasDark ? '#18181b' : '#ffffff' }" :title="translate('zx_builder_preview_title')" @load="sendState" />
    </div>
  </div>
</template>
<script>
import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { runtimeNodes } from '../../../domain/nodes.js';
import { componentThemesCss } from '../../../domain/component-themes.js';
import { useBuilder } from '../../composables/useBuilder.js';
export default defineComponent({
  setup() {
    const builder = useBuilder();
    const frame = ref(null);
    const dynamicCss = ref('');
    let timer;
    let generation = 0;
    function sendState() {
      frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'state', instances: JSON.parse(JSON.stringify(builder.previewInstances.value)), selectedNodeId: builder.nodeId.value, selectedInstanceId: builder.mode.value === 'library' ? 'library' : builder.instanceId.value, editable: !builder.previewOnly.value, canCopyNode: builder.canCopyNode.value, canDuplicateNode: builder.canCopyNode.value && builder.canEditRemote.value, canDeleteNode: builder.canCopyNode.value && builder.canEditRemote.value, canvasDark: builder.canvasDark.value, language: builder.language.value, css: dynamicCss.value, themeCss: componentThemesCss(builder.document.value.componentThemes), styles: JSON.parse(JSON.stringify(builder.document.value.styles)) }, window.location.origin);
    }
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.value?.contentWindow || event.data?.channel !== 'zaux-studio') return;
      const message = event.data;
      if (!builder.previewOnly.value && message.instanceId === (builder.mode.value === 'library' ? 'library' : builder.instanceId.value) && message.nodeId === builder.nodeId.value) {
        if (message.type === 'copy-node') builder.copySelectedNode();
        if (message.type === 'duplicate-node') builder.duplicateNode();
        if (message.type === 'delete-node') builder.deleteNode();
      }
      if (message.type === 'ready') sendState();
      if (message.type === 'select') builder.selectInstance(message.instanceId, message.nodeId);
      if (message.type === 'drop' && !builder.previewOnly.value) builder.dropElement(message.payload, message.nodeId, message.position, message.instanceId);
    }
    async function compileCss() {
      const token = ++generation;
      try {
        const result = await $fetch('/api/preview-css', { method: 'POST', body: { content: JSON.stringify({ rendered: builder.previewInstances.value.map(instance => runtimeNodes(instance.definition, instance.data)), instances: builder.previewInstances.value, uiSettings: builder.document.value.styles.uiSettings }) } });
        if (token === generation) { dynamicCss.value = result.css; sendState(); }
      } catch { if (token === generation) builder.error.value = 'zx_builder_css_error'; }
    }
    watch([() => builder.document.value.componentThemes, builder.previewInstances, builder.nodeId, builder.instanceId, builder.previewOnly, builder.canCopyNode, builder.canEditRemote, builder.canvasDark, builder.language, () => builder.document.value.styles], sendState, { deep: true });
    watch([builder.previewInstances, () => builder.document.value.styles.uiSettings], () => { clearTimeout(timer); timer = setTimeout(compileCss, 450); }, { deep: true });
    onMounted(() => { window.addEventListener('message', receive); compileCss(); });
    onBeforeUnmount(() => { window.removeEventListener('message', receive); clearTimeout(timer); generation++; });
    return { ...builder, frame, sendState };
  }
});
</script>
