<template>
  <div class="flex flex-col flex-1 min-h-0 p-2 overflow-auto bg-zaux-light">
    <button type="button" class="mb-1 self-end text-[11px] underline" @click="reload">{{ translate('zx_builder_theme_reload_preview') }}</button>
    <iframe :key="frameKey" ref="frame" src="/preview" class="min-h-[420px] w-full flex-1 border-none bg-white"
      :title="translate('zx_builder_theme_preview')" @load="sendState" />
  </div>
</template>
<script>

  import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from 'vue';
  import { useBuilder } from '../../composables/useBuilder.js';
  import { componentThemesCss } from '../../../domain/component-themes.js';

  export default defineComponent({
    props: { node: { type: Object, required: true }, background: String },
    setup(props) {
      const builder = useBuilder();
      const frame = ref(null);
      const frameKey = ref(0);
      function reload() { frameKey.value++; }
      let dynamicCss = '';
      let timer;
      let generation = 0;
      function instances() {
        return [{ id: 'theme-preview', name: props.node.name, data: {}, definition: { fields: [], css: '', tree: [props.node] } }];
      }
      function sendState() {
        frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'state',
          instances: JSON.parse(JSON.stringify(instances())), editable: false, themePreview: true,
          background: props.background, language: builder.language.value, css: dynamicCss,
          themeCss: componentThemesCss(builder.document.value.componentThemes),
          styles: JSON.parse(JSON.stringify(builder.document.value.styles))
        }, window.location.origin);
      }
      function receive(event) {
        if (event.origin !== window.location.origin || event.source !== frame.value?.contentWindow || event.data?.channel !== 'zaux-studio') return;
        if (event.data.type === 'ready') sendState();
      }
      async function compileCss() {
        const token = ++generation;
        try {
          const result = await $fetch('/api/preview-css', { method: 'POST', body: { content: JSON.stringify({ instances: instances(), uiSettings: builder.document.value.styles.uiSettings }) } });
          if (token === generation) { dynamicCss = result.css; sendState(); }
        } catch { if (token === generation) builder.error.value = 'zx_builder_css_error'; }
      }
      watch([() => props.node, () => props.background, builder.language, () => builder.document.value.styles, () => builder.document.value.componentThemes], sendState, { deep: true });
      watch([() => props.node, () => builder.document.value.styles.uiSettings], () => {
        clearTimeout(timer); generation++; timer = setTimeout(compileCss, 450);
      }, { deep: true });
      onMounted(() => { window.addEventListener('message', receive); compileCss(); });
      onBeforeUnmount(() => { clearTimeout(timer); generation++; window.removeEventListener('message', receive); });
      return { frame, frameKey, reload, sendState, translate: builder.translate };
    }
  });
  
</script>
