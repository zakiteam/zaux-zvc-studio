<template>
  <BuilderModal :title="translate('zx_builder_media_library')" size="xl" height="fill" :busy="busy" bodyClass="flex flex-col p-0"
    @close="$emit('close')" @paste="paste" @dragenter="dragEnter" @dragover="dragOver" @dragleave="dragLeave" @drop="drop">
    <template #header>
      <div v-if="scopes.length > 1" class="flex gap-[2px] rounded-xxs bg-zaux-light p-[2px]" role="group" :aria-label="translate('zx_builder_media_scope')">
        <button v-for="item in scopes" :key="item" type="button"
          class="rounded-xxs px-1 py-0.25 text-[11px] font-semibold focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent disabled:opacity-50"
          :class="scope === item ? 'bg-zaux-white text-zaux-dark shadow-sm' : 'text-zaux-dark-grey hover:text-zaux-dark'"
          :aria-pressed="scope === item" :disabled="busy" @click="scope = item">
          {{ translate('zx_builder_media_' + item) }}
        </button>
      </div>
      <span v-else class="rounded-xxs bg-zaux-light px-1 py-0.25 text-[11px] font-semibold text-zaux-dark-grey">{{ translate('zx_builder_media_' + scope) }}</span>
    </template>

    <div class="flex shrink-0 flex-wrap items-center gap-1 border-b-slim border-zaux-light-grey px-2 py-1.5">
      <BuilderInput v-model="search" type="search" maxlength="100" :disabled="busy" :label="translate('zx_builder_media_search')"
        :placeholder="translate('zx_builder_media_search')" class="min-w-[200px] flex-1" />
      <span v-if="loading || busy" role="status" class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_loading') }}</span>
      <template v-if="canManage">
        <input ref="fileInput" class="sr-only" type="file" tabindex="-1" aria-hidden="true" accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg" :disabled="busy || loading" @change="upload" />
        <BuilderButton size="xs" icon="upload" :extraProps="{ actionIcon: false }" :disabled="busy || loading"
          :label="translate('zx_builder_media_upload') + ' · ' + translate('zx_builder_media_' + scope)"
          :title="translate('zx_builder_media_upload_hint')" @click="fileInput.click()" />
      </template>
    </div>
    <p v-if="error" role="alert" class="mx-2 mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] text-utility-error">{{ translate(error) }}</p>

    <div class="relative flex flex-1 min-h-0 max-[760px]:flex-col max-[760px]:overflow-auto">
      <!-- Asset grid. Double-click chooses directly. -->
      <div class="flex-1 min-w-0 min-h-0 p-2 overflow-auto zb-scroll" :aria-busy="loading">
        <div v-if="!loading && !assets.length" class="flex flex-col items-center justify-center gap-1 py-8 text-center text-zaux-dark-grey">
          <Icon iconName="media-gallery" size="text-icon-m" aria-hidden="true" />
          <p>{{ translate('zx_builder_media_empty') }}</p>
          <p v-if="canManage" class="max-w-[420px] text-[11px]">{{ translate('zx_builder_media_upload_hint') }}</p>
        </div>
        <ul class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5 p-0">
          <li v-for="asset in assets" :key="asset.id" class="relative min-w-0 group">
            <button type="button" :disabled="busy || loading"
              class="w-full min-w-0 overflow-hidden text-left rounded-xs border-slim p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
              :class="selected?.id === asset.id ? 'border-zaux-accent bg-zaux-accent/10 outline outline-1 outline-zaux-accent' : 'border-zaux-light-grey hover:border-zaux-dark-grey'"
              :aria-pressed="selected?.id === asset.id" @click="selected = asset" @dblclick="!manageOnly && $emit('select', asset)">
              <img :src="asset.thumbnailUrl" alt="" loading="lazy" class="aspect-[4/3] w-full rounded-xxs bg-zaux-light object-contain" />
              <span class="mt-0.5 block truncate px-0.25 text-[11px]" :title="asset.name">{{ asset.name }}</span>
              <span class="block px-0.25 text-[10px] text-zaux-dark-grey tabular-nums">{{ asset.width }} &times; {{ asset.height }}</span>
            </button>
            <BuilderButton class="absolute right-1 top-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100" icon="download" iconOnly size="xs" variant="light1"
              :label="translate('zx_builder_media_download') + ': ' + asset.name"
              :disabled="busy || loading" @click="download(asset)" />
          </li>
        </ul>
      </div>

      <!-- Details of the selected asset, or the library notes. -->
      <aside class="flex w-[300px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-light/40 max-[760px]:w-full max-[760px]:border-l-0 max-[760px]:border-t-slim" :aria-label="translate('zx_builder_media_details')">
        <div class="flex-1 min-h-0 p-2 overflow-auto zb-scroll">
          <template v-if="selected">
            <img :src="selected.thumbnailUrl" alt="" class="aspect-[4/3] w-full rounded-xs border-slim border-zaux-light-grey bg-zaux-light object-contain" />
            <p class="mt-1 break-words text-[12px] font-semibold">{{ selected.name }}</p>
            <p class="text-[11px] text-zaux-dark-grey tabular-nums">{{ selected.width }} &times; {{ selected.height }}</p>
            <BuilderInput class="mt-1 w-full font-mono !text-[10px]" readonly :modelValue="selected.url"
              :label="translate('zx_builder_media_url')" @focus="$event.target.select()" />
            <div class="flex flex-wrap gap-1 mt-1">
              <BuilderButton size="xs" icon="download" :extraProps="{ actionIcon: false }" :label="translate('zx_builder_media_download')" :disabled="busy || loading" @click="download(selected)" />
              <BuilderButton v-if="canManage" size="xs" variant="alt1" icon="delete" :extraProps="{ actionIcon: false }" class="[&.zb-button]:!text-utility-error"
                :label="translate('zx_builder_media_archive')" :disabled="busy || loading" @click="archive" />
            </div>
            <p v-if="canManage" class="mt-1 text-[10px] leading-relaxed text-zaux-dark-grey">{{ translate('zx_builder_media_archive_hint') }}</p>
          </template>
          <div v-else class="space-y-1 text-[11px] leading-relaxed text-zaux-dark-grey">
            <p class="font-semibold text-zaux-dark">{{ translate('zx_builder_media_no_selection') }}</p>
            <p>{{ translate(scope === 'global' ? 'zx_builder_media_global_hint' : 'zx_builder_media_project_hint') }}</p>
            <p>{{ translate('zx_builder_media_public_hint') }}</p>
            <p v-if="canManage">{{ translate('zx_builder_media_upload_hint') }}</p>
          </div>
        </div>
      </aside>

      <div v-if="dragging" aria-hidden="true"
        class="pointer-events-none absolute inset-1.5 z-10 grid place-items-center rounded-s border-2 border-dashed border-zaux-accent bg-zaux-white/85 text-[13px] font-semibold text-zaux-accent">
        {{ translate('zx_builder_media_drop') }} &middot; {{ translate('zx_builder_media_' + scope) }}
      </div>
    </div>

    <template #footer="{ close }">
      <div class="flex items-center mr-auto gap-0.5">
        <BuilderButton size="xs" variant="alt1" icon="chevron-left" iconOnly :label="translate('zx_builder_media_previous')" :disabled="!page || busy || loading" @click="page--" />
        <span class="min-w-[24px] text-center text-[11px] tabular-nums">{{ page + 1 }}</span>
        <BuilderButton size="xs" variant="alt1" icon="chevron-right" iconOnly :label="translate('zx_builder_media_next')" :disabled="!hasMore || busy || loading" @click="page++" />
      </div>
      <BuilderButton v-if="!manageOnly && clearable" size="xs" variant="alt1" :label="translate('zx_builder_media_remove')" :disabled="busy" @click="$emit('select', null)" />
      <BuilderButton v-if="manageOnly" size="xs" :label="translate('zx_builder_close')" :disabled="busy" @click="close" />
      <BuilderButton v-else size="xs" variant="primary" :label="translate('zx_builder_media_choose')" :disabled="!selected || busy || loading" @click="$emit('select', selected)" />
    </template>
  </BuilderModal>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
import { listMedia, uploadMedia, archiveMedia, downloadMedia } from '../../services/media.js';
import BuilderButton from './BuilderButton.vue';
import BuilderModal from './BuilderModal.vue';
import BuilderInput from './fields/BuilderInput.vue';

export default defineComponent({
  components: { BuilderButton, BuilderInput, BuilderModal },
  props: {
    projectId: String, initialScope: String, scopeOnly: String,
    canManageProject: Boolean, readonly: Boolean, manageOnly: Boolean, clearable: Boolean
  },
  emits: ['select', 'close'],
  setup(props) {
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
    async function uploadFile(file) {
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
    function upload(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      uploadFile(file);
    }
    function paste(event) {
      if (!canManage.value || busy.value || loading.value) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      let file = null;
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) { file = item.getAsFile(); break; }
      }
      if (!file) return;
      // Keep normal text pastes working inside text fields that also receive text.
      const target = event.target;
      const textEntry = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (textEntry && event.clipboardData.getData('text/plain')) return;
      event.preventDefault();
      // Some browsers hand clipboard images over without a name; the server requires one.
      const extension = (file.type.split('/')[1] || 'png').replace(/\+.*/, '');
      uploadFile(file.name ? file : new File([file], `clipboard-${Date.now()}.${extension}`, { type: file.type }));
    }
    async function download(asset) {
      if (busy.value || loading.value) return;
      busy.value = true;
      error.value = '';
      try { await downloadMedia(asset); }
      catch { if (!disposed) error.value = 'zx_builder_media_download_error'; }
      finally { if (!disposed) busy.value = false; }
    }
    async function archive() {
      if (!selected.value || busy.value || !canManage.value) return;
      busy.value = true;
      try { await archiveMedia(selected.value.id); if (!disposed) await load(); }
      catch (exception) { if (!disposed) failure(exception); }
      finally { if (!disposed) busy.value = false; }
    }
    // Dropping an image file anywhere in the dialog uploads it to the current scope.
    const fileInput = ref(null);
    const dragging = ref(false);
    let dragDepth = 0;
    const hasFiles = event => !!event.dataTransfer && [...event.dataTransfer.types].includes('Files');
    function dragEnter(event) {
      if (!hasFiles(event) || !canManage.value) return;
      event.preventDefault();
      dragDepth++;
      dragging.value = true;
    }
    function dragOver(event) {
      if (!hasFiles(event) || !canManage.value) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = busy.value || loading.value ? 'none' : 'copy';
    }
    function dragLeave(event) {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) dragging.value = false;
    }
    function drop(event) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      dragging.value = false;
      if (!canManage.value || busy.value || loading.value) return;
      const files = [...event.dataTransfer.files];
      uploadFile(files.find(file => file.type.startsWith('image/')) ?? files[0]);
    }
    onMounted(load);
    onBeforeUnmount(() => { disposed = true; request++; clearTimeout(timer); });
    return { ...useTranslation(), fileInput, dragging, scopes, scope, canManage, assets, selected, search, page, hasMore, loading, busy, error, upload, paste, download, archive, dragEnter, dragOver, dragLeave, drop };
  }
});
</script>
