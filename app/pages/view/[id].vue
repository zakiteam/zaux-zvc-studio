<template>
  <main :style="{ position: 'fixed', inset: 0, backgroundColor: canvasDark ? '#18181b' : '#ffffff' }">
    <iframe v-show="state && !error" ref="frame" src="/preview" :title="title"
      style="display: block; width: 100%; height: 100%; border: 0" @load="sendState" />
    <p v-if="error || !state" :role="error ? 'alert' : 'status'"
      :style="{ padding: '24px', color: canvasDark ? '#ffffff' : '#18181b' }">{{ translate(error || 'zx_builder_loading') }}</p>
  </main>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useHead, useRoute } from '#imports';
import { getRemoteProject } from '../../services/projects.js';
import { previewStorageKeys, readPreviewWorkspace } from '../../services/preview-page.js';
import { refreshSourceSnapshots } from '../../services/source-zvc.js';
import { componentThemesCss } from '../../../domain/component-themes.js';
import { runtimeNodes } from '../../../domain/nodes.js';
import { useTranslation } from '../../composables/useTranslation.js';

export default defineComponent({
  setup() {
    const route = useRoute();
    const { translate, language } = useTranslation();
    const frame = ref(null);
    const state = ref(null);
    const error = ref('');
    const title = ref(translate('zx_builder_preview_title'));
    const canvasDark = computed(() => route.query.canvas === 'dark');
    let remoteDocument = null;
    let generation = 0;
    let loadGeneration = 0;
    let authorized = false;
    useHead(() => ({ title: title.value }));
    function sendState() {
      if (state.value) frame.value?.contentWindow?.postMessage({ channel: 'zaux-studio', type: 'state', ...JSON.parse(JSON.stringify(state.value)) }, window.location.origin);
    }
    function receive(event) {
      if (event.origin === window.location.origin && event.source === frame.value?.contentWindow
        && event.data?.channel === 'zaux-studio' && event.data.type === 'ready') sendState();
    }
    async function render() {
      if (!authorized) return;
      const token = ++generation;
      try {
        const workspace = readPreviewWorkspace(String(route.params.id), remoteDocument);
        refreshSourceSnapshots(workspace);
        const componentId = typeof route.query.component === 'string' ? route.query.component : null;
        const component = componentId ? workspace.library.find(item => item.id === componentId) : null;
        const template = route.query.template ? workspace.templates.find(item => item.id === route.query.template) : workspace.templates[0];
        if (componentId ? !component : !template) throw new Error('zx_builder_preview_unavailable');
        const instances = component ? [{ id: 'library', name: component.name, definition: component, data: {} }] : template.instances;
        const result = await $fetch('/api/preview-css', { method: 'POST', body: { content: JSON.stringify({
          instances, rendered: instances.map(instance => runtimeNodes(instance.definition, instance.data)), uiSettings: workspace.styles?.uiSettings
        }) } });
        if (token !== generation) return;
        title.value = component?.name ?? template.name;
        state.value = { instances, styles: workspace.styles ?? { cssVars: [], uiSettings: {} },
          themeCss: componentThemesCss(workspace.componentThemes), css: result.css, language: language.value,
          editable: false, clean: true, canvasDark: canvasDark.value };
        error.value = '';
        sendState();
      } catch (exception) {
        if (token === generation) error.value = exception.message?.startsWith('zx_builder_') ? exception.message : 'zx_builder_preview_unavailable';
      }
    }
    async function load() {
      const token = ++loadGeneration;
      generation++;
      authorized = false;
      state.value = null;
      error.value = '';
      try {
        const id = String(route.params.id);
        // Remote links retain the same project access checks as the editor.
        const document = id === 'local' ? null : (await getRemoteProject(id)).document;
        if (token !== loadGeneration) return;
        remoteDocument = document;
        authorized = true;
        await render();
      } catch { if (token === loadGeneration) error.value = 'zx_builder_preview_unavailable'; }
    }
    function storageChanged(event) {
      if (event.key === null || previewStorageKeys(String(route.params.id)).includes(event.key)) render();
    }
    watch(() => route.fullPath, load);
    onMounted(() => { window.addEventListener('message', receive); window.addEventListener('storage', storageChanged); load(); });
    onBeforeUnmount(() => { generation++; loadGeneration++; authorized = false; window.removeEventListener('message', receive); window.removeEventListener('storage', storageChanged); });
    return { frame, state, error, title, canvasDark, translate, sendState };
  }
});
</script>
