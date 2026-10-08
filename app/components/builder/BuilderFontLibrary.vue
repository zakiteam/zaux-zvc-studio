<template>
  <BuilderModal :title="translate('zx_builder_fonts_library')" :hint="translate(manage ? 'zx_builder_fonts_shared' : 'zx_builder_fonts_project_hint')"
    size="lg" height="fill" :busy="busy" bodyClass="flex p-0 max-[760px]:flex-col" @close="$emit('close')">
    <template #default>
      <!-- Catalog. -->
      <section class="flex flex-col flex-1 min-w-0 min-h-0 max-[760px]:min-h-[360px]" :aria-label="translate('zx_builder_fonts_library')">
        <div class="flex shrink-0 items-center gap-1 border-b-slim border-zaux-light-grey px-2 py-1.5">
          <BuilderInput v-model="search" type="search" maxlength="100" :disabled="busy" :label="translate('zx_builder_fonts_search')" :placeholder="translate('zx_builder_fonts_search')" class="flex-1" />
          <span v-if="loading || busy" role="status" class="shrink-0 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_loading') }}</span>
        </div>
        <p v-if="error" role="alert" class="mx-2 mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] text-utility-error">{{ translate(error) }}</p>
        <div class="flex-1 min-h-0 px-2 py-1.5 overflow-auto zb-scroll" :aria-busy="loading">
          <p v-if="!loading && !entries.length" class="py-6 text-center text-zaux-dark-grey">{{ translate('zx_builder_fonts_empty') }}</p>
          <ul class="flex flex-col gap-1 p-0 m-0 list-none">
            <li v-for="entry in entries" :key="entry.id"
              class="rounded-xs border-slim p-1 transition-colors"
              :class="isSelected(entry) ? 'border-zaux-accent bg-zaux-accent/5' : editing?.id === entry.id ? 'border-zaux-accent/60' : 'border-zaux-light-grey hover:border-zaux-dark-grey'">
              <div class="flex items-center gap-1">
                <div class="flex-1 min-w-0">
                  <strong class="block truncate text-[12px]" :title="entry.family">{{ entry.family }}</strong>
                  <iframe class="pointer-events-none block h-[34px] w-full border-none bg-transparent" sandbox="" loading="lazy" tabindex="-1" aria-hidden="true"
                    :title="translate('zx_builder_fonts_preview', { family: entry.family })" :srcdoc="sampleDocument(entry)" />
                </div>
                <div class="flex items-center shrink-0 gap-0.5">
                  <template v-if="manage && entry.owner_id === user?.id">
                    <BuilderButton size="xs" variant="alt1" icon="edit" iconOnly :disabled="busy || loading" :label="translate('zx_builder_fonts_edit') + ': ' + entry.family" @click="edit(entry)" />
                    <BuilderButton size="xs" variant="alt1" icon="delete" iconOnly :disabled="busy || loading" :label="translate('zx_builder_fonts_archive') + ': ' + entry.family" @click="archive(entry)" />
                  </template>
                  <BuilderButton size="xs" v-if="!manage" :variant="isSelected(entry) ? 'secondary' : 'alt1'" :disabled="readonly || loading"
                    :icon="isSelected(entry) ? 'checkmark' : 'plus'" :extraProps="{ actionIcon: false }" :aria-pressed="isSelected(entry)"
                    :label="translate(isSelected(entry) ? 'zx_builder_fonts_remove' : 'zx_builder_add')" @click="toggle(entry)" />
                </div>
              </div>
              <BuilderInput readonly :modelValue="entry.href" :label="translate('zx_builder_fonts_link')" class="mt-0.5 w-full !bg-transparent !px-0 !py-0 font-mono !text-[10px] text-zaux-dark-grey" @focus="$event.target.select()" />
            </li>
          </ul>
        </div>
      </section>

      <!-- Side panel: add/edit form when managing, project selection otherwise. -->
      <aside class="zb-scroll w-[320px] shrink-0 overflow-auto border-l-slim border-zaux-light-grey bg-zaux-light/40 p-2 max-[760px]:w-full max-[760px]:border-l-0 max-[760px]:border-t-slim">
        <form v-if="manage" class="grid gap-1.5" @submit.prevent="save">
          <h3 class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate(editing ? 'zx_builder_fonts_edit' : 'zx_builder_add') }}</h3>
          <label class="text-[11px]">{{ translate('zx_builder_fonts_link') }}
            <textarea v-model="link" rows="4" required :disabled="busy" class="w-full mt-0.5 font-mono !text-[11px] bg-zaux-light" @change="suggest" />
          </label>
          <label class="text-[11px]">{{ translate('zx_builder_fonts_family') }}
            <BuilderInput v-model="family" required maxlength="120" :disabled="busy" :label="translate('zx_builder_fonts_family')" class="w-full mt-0.5" />
          </label>
          <p class="text-[10px] leading-relaxed text-zaux-dark-grey">{{ translate('zx_builder_fonts_family_hint') }}</p>
          <div class="flex gap-1">
            <BuilderButton type="submit" size="xs" variant="primary" class="flex-1" :disabled="busy || !family.trim() || !link.trim()"
              :label="translate(editing ? 'zx_builder_save' : 'zx_builder_add')" @click="save" />
            <BuilderButton v-if="editing" size="xs" :disabled="busy" :label="translate('zx_builder_cancel')" @click="resetForm" />
          </div>
        </form>
        <template v-else>
          <h3 class="mb-1 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
            {{ translate('zx_builder_fonts_selected') }} <span class="font-normal tracking-normal">{{ selected.length }}</span>
          </h3>
          <p v-if="!selected.length" class="text-[11px] leading-relaxed text-zaux-dark-grey">{{ translate('zx_builder_fonts_project_hint') }}</p>
          <ul class="flex flex-col gap-0.5 p-0 m-0 list-none">
            <li v-for="entry in selected" :key="entry.id" class="flex items-center gap-1 rounded-xxs bg-zaux-white py-0.5 pl-1 pr-0.25">
              <span class="flex-1 min-w-0 truncate" :title="entry.family">{{ entry.family }}</span>
              <BuilderButton size="xs" variant="alt1" icon="close" iconOnly :label="translate('zx_builder_fonts_remove') + ': ' + entry.family" :disabled="readonly" @click="toggle(entry)" />
            </li>
          </ul>
          <details v-if="selected.length" class="mt-2">
            <summary class="cursor-pointer">{{ translate('zx_builder_fonts_developer') }}</summary>
            <BuilderCodeEditor :modelValue="links" language="html" readonly :label="translate('zx_builder_fonts_link')" />
            <div class="flex flex-wrap gap-1 mt-1">
              <BuilderButton size="xs" icon="download" :extraProps="{ actionIcon: false }" :label="translate('zx_builder_fonts_export_json')" @click="downloadManifest" />
              <BuilderButton size="xs" icon="download" :extraProps="{ actionIcon: false }" :label="translate('zx_builder_fonts_export_html')" @click="downloadLinks" />
            </div>
          </details>
        </template>
      </aside>
    </template>
    <template #footer="{ close }">
      <div class="flex items-center mr-auto gap-0.5">
        <BuilderButton size="xs" variant="alt1" icon="chevron-left" iconOnly :disabled="!page || loading || busy" :label="translate('zx_builder_media_previous')" @click="page--" />
        <span class="min-w-[24px] text-center text-[11px] tabular-nums">{{ page + 1 }}</span>
        <BuilderButton size="xs" variant="alt1" icon="chevron-right" iconOnly :disabled="!hasMore || loading || busy" :label="translate('zx_builder_media_next')" @click="page++" />
      </div>
      <template v-if="!manage">
        <BuilderButton size="xs" variant="alt1" :disabled="busy" :label="translate('zx_builder_cancel')" @click="close" />
        <BuilderButton size="xs" variant="primary" :disabled="readonly" :label="translate('zx_builder_apply')" @click="$emit('apply', selected)" />
      </template>
    </template>
  </BuilderModal>
</template>
<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useTranslation } from '../../composables/useTranslation.js';
import { useStudioTheme } from '../../composables/useStudioTheme.js';
import { listFonts, saveFont, archiveFont, parseFontLink } from '../../services/fonts.js';
import { fontEntry, fontLinks, projectFonts } from '../../../domain/fonts.js';
import { downloadText } from '../../services/files.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export default defineComponent({
  props: { manage: Boolean, readonly: Boolean, modelValue: { default: () => [] } },
  emits: ['apply', 'close'],
  setup(props) {
    const { user } = useAuth();
    const translation = useTranslation();
    const { theme } = useStudioTheme();
    const selected = ref(projectFonts(props.modelValue));
    const links = computed(() => fontLinks(selected.value));
    const entries = ref([]);
    const search = ref('');
    const page = ref(0);
    const hasMore = ref(false);
    const family = ref('');
    const link = ref('');
    const editing = ref(null);
    const error = ref('');
    const busy = ref(false);
    const loading = ref(false);
    let disposed = false;
    let request = 0;
    let timer;
    function failure(exception) { error.value = exception.message?.startsWith('zx_builder_fonts_') ? exception.message : 'zx_builder_fonts_error'; }
    async function load() {
      const current = ++request;
      loading.value = true;
      error.value = '';
      try {
        const result = await listFonts(search.value, page.value);
        if (!disposed && current === request) { entries.value = result.entries; hasMore.value = result.hasMore; }
      } catch (exception) { if (!disposed && current === request) { entries.value = []; hasMore.value = false; failure(exception); } }
      finally { if (!disposed && current === request) loading.value = false; }
    }
    function schedule() { request++; loading.value = true; clearTimeout(timer); timer = setTimeout(load, 250); }
    watch(search, () => { page.value = 0; schedule(); });
    watch(page, schedule);
    function resetForm() { editing.value = null; family.value = ''; link.value = ''; }
    function suggest() {
      try { const result = parseFontLink(link.value); if (!family.value) family.value = result.families[0] ?? ''; error.value = ''; }
      catch (exception) { failure(exception); }
    }
    function edit(entry) { editing.value = entry; family.value = entry.family; link.value = entry.href; }
    async function save() {
      if (busy.value || !props.manage) return;
      busy.value = true; error.value = '';
      try {
        const { href } = parseFontLink(link.value);
        await saveFont({ family: family.value, href }, user.value.id, editing.value);
        if (disposed) return;
        resetForm(); search.value = ''; page.value = 0;
        await nextTick(); clearTimeout(timer); await load();
      } catch (exception) { if (!disposed) failure(exception); }
      finally { if (!disposed) busy.value = false; }
    }
    async function archive(entry) {
      if (busy.value || !props.manage) return;
      busy.value = true;
      try { await archiveFont(entry); if (!disposed) { if (editing.value?.id === entry.id) resetForm(); await load(); } }
      catch (exception) { if (!disposed) failure(exception); }
      finally { if (!disposed) busy.value = false; }
    }
    const isSelected = entry => selected.value.some(item => item.id === entry.id);
    function toggle(entry) {
      if (props.readonly) return;
      try {
        selected.value = isSelected(entry)
          ? selected.value.filter(item => item.id !== entry.id) : projectFonts([...selected.value, fontEntry(entry)]);
      } catch (exception) { failure(exception); }
    }
    // Sandboxed sample: third-party stylesheets never reach the Studio document.
    function sampleDocument(entry) {
      const dark = theme.value === 'dark';
      const css = `:root{color-scheme:${dark ? 'dark' : 'light'}}html,body{margin:0;background:transparent;overflow:hidden}`
        + `body{color:${dark ? '#e8e8ed' : '#363636'};font:22px/34px ${JSON.stringify(String(entry.family)).replace(/</g, '\\3c ')},system-ui,sans-serif;white-space:nowrap;text-overflow:ellipsis}`;
      return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${escapeHtml(entry.href)}"><style>${css}</style></head>`
        + `<body>${escapeHtml(translation.translate('zx_builder_fonts_sample'))}</body></html>`;
    }
    function downloadManifest() { downloadText('fonts.json', JSON.stringify(selected.value, null, 2)); }
    function downloadLinks() { downloadText('fonts.html', links.value, 'text/html'); }
    onMounted(load);
    onBeforeUnmount(() => { disposed = true; request++; clearTimeout(timer); });
    return { ...translation, user, entries, search, page, hasMore, selected, links, family, link, editing, error, busy, loading, resetForm, suggest, edit, save, archive, isSelected, toggle, sampleDocument, downloadManifest, downloadLinks };
  }
});
</script>
