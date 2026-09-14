<template>
  <dialog ref="dialog" :aria-labelledby="titleId" @keydown.stop @cancel="cancel" @close="$emit('close')"
    class="w-[790px] max-w-[calc(100vw-32px)] max-h-[90dvh] overflow-auto rounded-s border-none bg-zaux-white p-4 font-builder text-zaux-dark shadow-deeper backdrop:bg-zaux-black/40">
    <header class="mb-3 flex items-center justify-between gap-2">
      <h2 :id="titleId" class="text-[20px] font-medium">{{ translate('zx_builder_media_library') }}</h2>
      <BuilderButton icon="close" iconOnly :label="translate('zx_builder_close')" :disabled="busy" @click="dialog.close()" />
    </header>
    <div class="mb-2 flex flex-wrap gap-1" role="group" :aria-label="translate('zx_builder_media_scope')">
      <BuilderButton v-for="item in scopes" :key="item" :label="translate('zx_builder_media_' + item)"
        :aria-pressed="scope === item" :variant="scope === item ? 'primary' : 'secondary'"
        :disabled="busy" @click="scope = item" />
    </div>
    <p class="mb-2 text-[11px] text-zaux-dark-grey">{{ translate(scope === 'global' ? 'zx_builder_media_global_hint' : 'zx_builder_media_project_hint') }}</p>
    <p class="mb-3 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_media_public_hint') }}</p>
    <BuilderInput v-model="search" type="search" maxlength="100" :disabled="busy" :label="translate('zx_builder_media_search')"
      :placeholder="translate('zx_builder_media_search')" class="mb-2 w-full" />
    <label v-if="canManage" class="mb-3 block rounded-xs border-slim border-dashed border-zaux-light-grey p-2 text-[12px]">
      <span class="mb-1 block">{{ translate('zx_builder_media_upload') }} · {{ translate('zx_builder_media_' + scope) }}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy || loading" @change="upload" />
      <span class="mt-1 block text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_media_upload_hint') }}</span>
    </label>
    <p v-if="error" role="alert" class="mb-2 text-[12px] text-utility-error">{{ translate(error) }}</p>
    <p v-if="loading || busy" role="status" class="py-2 text-[12px]">{{ translate('zx_builder_loading') }}</p>
    <p v-if="!loading && !assets.length" class="py-3 text-[12px] text-zaux-dark-grey">{{ translate('zx_builder_media_empty') }}</p>
    <div class="grid grid-cols-2 gap-2 min-[600px]:grid-cols-4">
      <button v-for="asset in assets" :key="asset.id" type="button" :disabled="busy || loading"
        class="min-w-0 overflow-hidden rounded-xs border-slim p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
        :class="selected?.id === asset.id ? 'border-zaux-accent bg-zaux-accent/10' : 'border-zaux-light-grey'"
        :aria-pressed="selected?.id === asset.id" @click="selected = asset">
        <img :src="asset.thumbnailUrl" alt="" loading="lazy" class="h-[100px] w-full object-contain bg-zaux-light" />
        <span class="mt-1 block truncate text-[11px]" :title="asset.name">{{ asset.name }}</span>
        <span class="block text-[10px] text-zaux-dark-grey">{{ asset.width }} × {{ asset.height }}</span>
      </button>
    </div>
    <div class="mt-3 flex items-center justify-center gap-2">
      <BuilderButton :label="translate('zx_builder_media_previous')" :disabled="!page || busy || loading" @click="page--" />
      <span class="text-[11px]">{{ page + 1 }}</span>
      <BuilderButton :label="translate('zx_builder_media_next')" :disabled="!hasMore || busy || loading" @click="page++" />
    </div>
    <BuilderInput v-if="selected" class="mt-3 w-full text-[11px]" readonly :modelValue="selected.url"
      :label="translate('zx_builder_media_url')" @focus="$event.target.select()" />
    <footer class="mt-3 flex flex-wrap items-center justify-end gap-1">
      <BuilderButton v-if="canManage && selected" :label="translate('zx_builder_media_archive')" :disabled="busy || loading" @click="archive" />
      <BuilderButton v-if="!manageOnly && clearable" :label="translate('zx_builder_media_remove')" :disabled="busy" @click="$emit('select', null)" />
      <BuilderButton v-if="!manageOnly" variant="primary" :label="translate('zx_builder_media_choose')" :disabled="!selected || busy || loading" @click="$emit('select', selected)" />
    </footer>
    <p v-if="canManage" class="mt-2 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_media_archive_hint') }}</p>
  </dialog>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, nextTick, ref, useId, watch } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
import { listMedia, uploadMedia, archiveMedia } from '../../services/media.js';
import BuilderButton from './BuilderButton.vue';
import BuilderInput from './fields/BuilderInput.vue';

export default defineComponent({
  components: { BuilderButton, BuilderInput },
  props: {
    projectId: String, initialScope: String, scopeOnly: String,
    canManageProject: Boolean, readonly: Boolean, manageOnly: Boolean, clearable: Boolean
  },
  emits: ['select', 'close'],
  setup(props) {
    const dialog = ref(null);
    const scopes = computed(() => props.scopeOnly ? [props.scopeOnly] : props.projectId ? ['project', 'global'] : ['global']);
    const scope = ref(props.scopeOnly || props.initialScope || (props.projectId ? 'project' : 'global'));
    const canManage = computed(() => !props.readonly && (scope.value === 'global' || props.canManageProject));
    const assets = ref([]);
    const selected = ref(null);
    const search = ref('');
    const page = ref(0);
    const hasMore = ref(false);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    let request = 0;
    let timer;
    let disposed = false;
    let previousFocus;
    function failure(exception) { error.value = exception.message?.startsWith('zx_builder_media_') ? exception.message : 'zx_builder_media_error'; }
    async function load() {
      const current = ++request;
      loading.value = true;
      error.value = '';
      selected.value = null;
      try {
        const result = await listMedia({ scope: scope.value, projectId: props.projectId, search: search.value, page: page.value });
        if (disposed || current !== request) return;
        assets.value = result.assets;
        hasMore.value = result.hasMore;
      } catch (exception) {
        if (!disposed && current === request) { assets.value = []; hasMore.value = false; failure(exception); }
      } finally { if (!disposed && current === request) loading.value = false; }
    }
    function schedule() {
      request++;
      selected.value = null;
      loading.value = true;
      clearTimeout(timer);
      timer = setTimeout(load, 250);
    }
    watch([scope, search, () => props.projectId], () => { page.value = 0; schedule(); });
    watch(page, schedule);
    async function upload(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || busy.value || !canManage.value) return;
      busy.value = true;
      error.value = '';
      try {
        const asset = await uploadMedia(file, { scope: scope.value, projectId: props.projectId });
        if (disposed) return;
        search.value = ''; page.value = 0;
        await nextTick(); clearTimeout(timer);
        await load();
        if (!disposed) selected.value = asset;
      } catch (exception) { if (!disposed) failure(exception); }
      finally { if (!disposed) busy.value = false; }
    }
    async function archive() {
      if (!selected.value || busy.value || !canManage.value) return;
      busy.value = true;
      try { await archiveMedia(selected.value.id); if (!disposed) await load(); }
      catch (exception) { if (!disposed) failure(exception); }
      finally { if (!disposed) busy.value = false; }
    }
    function cancel(event) { if (busy.value) event.preventDefault(); }
    onMounted(() => { previousFocus = document.activeElement; dialog.value.showModal(); load(); });
    onBeforeUnmount(() => {
      disposed = true; request++; clearTimeout(timer); dialog.value?.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    });
    return { ...useTranslation(), titleId: useId(), dialog, scopes, scope, canManage, assets, selected, search, page, hasMore, loading, busy, error, upload, archive, cancel };
  }
});
</script>
