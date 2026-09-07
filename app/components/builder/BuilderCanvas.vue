<template>
  <div class="zb-canvas-area flex min-h-0 flex-1 flex-col items-center overflow-auto bg-zaux-light px-4 pb-4 pt-2 max-[1200px]:p-2">
    <div class="zb-canvas-ruler h-[22px] w-full shrink-0 text-center [&>span]:font-mono [&>span]:text-[9px] [&>span]:tracking-[1px] [&>span]:text-zaux-dark-grey"><span>{{ viewport === 'desktop' ? 'AUTO' : viewport === 'tablet' ? '768 PX' : '390 PX' }}</span></div>
    <div class="zb-preview-frame min-h-[450px] w-full flex-1 overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white shadow-deep transition-[width] [&.zb-preview-frame--tablet]:box-content [&.zb-preview-frame--tablet]:w-[768px] [&.zb-preview-frame--tablet]:shrink-0 [&.zb-preview-frame--mobile]:box-content [&.zb-preview-frame--mobile]:w-[390px] [&.zb-preview-frame--mobile]:shrink-0 [&>iframe]:block [&>iframe]:h-full [&>iframe]:min-h-[450px] [&>iframe]:w-full [&>iframe]:border-none [&>iframe]:bg-zaux-white" :class="`zb-preview-frame--${viewport}`">
      <iframe ref="frame" src="/preview" :title="translate('zx_builder_preview_title')" @load="sendState" />
    </div>
  </div>
</template>
<script>
import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
export default defineComponent({
  setup() {
    const builder = useBuilder();
    const frame = ref(null);
    const dynamicCss = ref('');
    let timer;
    let generation = 0;
    function sendState() {
      frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'state', instances: JSON.parse(JSON.stringify(builder.previewInstances.value)), selectedNodeId: builder.nodeId.value, selectedInstanceId: builder.mode.value === 'library' ? 'library' : builder.instanceId.value, editable: !builder.previewOnly.value, language: builder.language.value, css: dynamicCss.value, styles: JSON.parse(JSON.stringify(builder.document.value.styles)) }, window.location.origin);
    }
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.value?.contentWindow || event.data?.channel !== 'zaux-studio') return;
      const message = event.data;
      if (message.type === 'ready') sendState();
      if (message.type === 'select') builder.selectInstance(message.instanceId, message.nodeId);
      if (message.type === 'drop' && !builder.previewOnly.value) builder.dropElement(message.payload, message.nodeId, message.position, message.instanceId);
    }
    async function compileCss() {
      const token = ++generation;
      try {
        const result = await $fetch('/api/preview-css', { method: 'POST', body: { content: JSON.stringify({ instances: builder.previewInstances.value, uiSettings: builder.document.value.styles.uiSettings }) } });
        if (token === generation) { dynamicCss.value = result.css; sendState(); }
      } catch { if (token === generation) builder.error.value = 'zx_builder_css_error'; }
    }
    watch([builder.previewInstances, builder.nodeId, builder.instanceId, builder.previewOnly, builder.language, () => builder.document.value.styles], sendState, { deep: true });
    watch([builder.previewInstances, () => builder.document.value.styles.uiSettings], () => { clearTimeout(timer); timer = setTimeout(compileCss, 450); }, { deep: true });
    onMounted(() => { window.addEventListener('message', receive); compileCss(); });
    onBeforeUnmount(() => { window.removeEventListener('message', receive); clearTimeout(timer); generation++; });
    return { ...builder, frame, sendState };
  }
});
</script>
