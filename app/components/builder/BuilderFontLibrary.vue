<template>
  <dialog ref="dialog" :aria-labelledby="titleId" @keydown.stop @cancel="cancel" @close="$emit('close')"
    class="w-[1400px] max-w-[calc(100vw-32px)] max-h-[90dvh] overflow-auto rounded-s border-none bg-zaux-white p-4 font-builder text-zaux-dark shadow-deeper backdrop:bg-zaux-black/40">
    <header class="flex items-center justify-between gap-2 mb-3">
      <h2 :id="titleId" class="text-[20px]">{{ translate('zx_builder_fonts_library') }}</h2>
      <BuilderButton icon="close" iconOnly :disabled="busy" :label="translate('zx_builder_close')" @click="dialog.close()" />
    </header>
    <p class="mb-3 text-[12px] text-zaux-dark-grey">{{ translate(manage ? 'zx_builder_fonts_shared' : 'zx_builder_fonts_project_hint') }}</p>
    <form v-if="manage" class="grid gap-2 p-2 mb-3 rounded-xs border-slim border-zaux-light-grey" @submit.prevent="save">
      <label class="text-[12px]">{{ translate('zx_builder_fonts_link') }}
        <textarea v-model="link" rows="3" required :disabled="busy" class="w-full p-2 mt-1 bg-zaux-light" @change="suggest" />
      </label>
      <label class="text-[12px]">{{ translate('zx_builder_fonts_family') }}
        <BuilderInput v-model="family" required maxlength="120" :disabled="busy" :label="translate('zx_builder_fonts_family')" class="w-full mt-1" />
      </label>
      <p class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_fonts_family_hint') }}</p>
      <div class="flex gap-1">
        <button type="submit" :disabled="busy || !family.trim() || !link.trim()" class="p-2 rounded-xxs bg-zaux-accent text-zaux-white disabled:opacity-50">{{ translate(editing ? 'zx_builder_save' : 'zx_builder_add') }}</button>
        <BuilderButton v-if="editing" :disabled="busy" :label="translate('zx_builder_cancel')" @click="resetForm" />
      </div>
    </form>
    <section v-if="!manage && selected.length" class="mb-3">
      <h3 class="mb-1 font-semibold">{{ translate('zx_builder_fonts_selected') }}</h3>
      <div v-for="entry in selected" :key="entry.id" class="flex items-center gap-2 p-2 mb-1 rounded-xs bg-zaux-light">
        <span class="flex-1 min-w-0 break-words">{{ entry.family }}</span>
        <BuilderButton :label="translate('zx_builder_fonts_remove')" :disabled="readonly" @click="toggle(entry)" />
      </div>
      <details>
        <summary class="cursor-pointer">{{ translate('zx_builder_fonts_developer') }}</summary>
        <BuilderCodeEditor :modelValue="links" language="html" readonly :label="translate('zx_builder_fonts_link')" />
        <div class="flex gap-1 mt-1">
          <BuilderButton :label="translate('zx_builder_fonts_export_json')" @click="downloadManifest" />
          <BuilderButton :label="translate('zx_builder_fonts_export_html')" @click="downloadLinks" />
        </div>
      </details>
    </section>
    <BuilderInput v-model="search" type="search" maxlength="100" :disabled="busy" :label="translate('zx_builder_fonts_search')" :placeholder="translate('zx_builder_fonts_search')" class="w-full mb-2" />
    <p v-if="error" role="alert" class="mb-2 text-utility-error">{{ translate(error) }}</p>
    <p v-if="loading || busy" role="status">{{ translate('zx_builder_loading') }}</p>
    <p v-if="!loading && !entries.length" class="py-2">{{ translate('zx_builder_fonts_empty') }}</p>
    <div class="grid grid-cols-1 gap-1">
      <article 
        v-for="entry in entries" :key="entry.id" 
        class="p-2 rounded-xs bg-zaux-light-grey"
        :class="[
          selected.some(item => item.id === entry.id) ? 'bg-zaux-light-grey outline outline-2 outline-zaux-accent' : 'bg-zaux-light'
        ]"
      >
        <div class="flex items-center gap-2">
          <strong class="flex-1 min-w-0 break-words">{{ entry.family }}</strong>
          <template v-if="manage && entry.owner_id === user?.id">
            <BuilderButton :disabled="busy || loading" :label="translate('zx_builder_fonts_edit')" @click="edit(entry)" />
            <BuilderButton :disabled="busy || loading" :label="translate('zx_builder_fonts_archive')" @click="archive(entry)" />
          </template>
          <BuilderButton size="xs" v-if="!manage" :disabled="readonly || loading" :aria-pressed="selected.some(item => item.id === entry.id)"
            :label="translate(selected.some(item => item.id === entry.id) ? 'zx_builder_fonts_remove' : 'zx_builder_add')" @click="toggle(entry)" />
        </div>
        <BuilderInput readonly :modelValue="entry.href" :label="translate('zx_builder_fonts_link')" class="w-full mt-1 text-[11px]" @focus="$event.target.select()" />
      </article>
    </div>
    <div class="flex justify-end gap-2 my-2">
      <BuilderButton :disabled="!page || loading || busy" :label="translate('zx_builder_media_previous')" @click="page--" />
      <span class="flex flex-col justify-center">{{ page + 1 }}</span>
      <BuilderButton :disabled="!hasMore || loading || busy" :label="translate('zx_builder_media_next')" @click="page++" />
    </div>
    <footer v-if="!manage" class="flex justify-end mt-3">
      <BuilderButton variant="primary" :disabled="readonly" :label="translate('zx_builder_apply')" @click="$emit('apply', selected)" />
    </footer>
  </dialog>
</template>
<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useTranslation } from '../../composables/useTranslation.js';
import { listFonts, saveFont, archiveFont, parseFontLink } from '../../services/fonts.js';
import { fontEntry, fontLinks, projectFonts } from '../../../domain/fonts.js';
import { downloadText } from '../../services/files.js';
import BuilderInput from './fields/BuilderInput.vue';
import BuilderCodeEditor from './fields/BuilderCodeEditor.vue';
import BuilderButton from './BuilderButton.vue';

export default defineComponent({
  components: { BuilderInput, BuilderCodeEditor, BuilderButton },
  props: { manage: Boolean, readonly: Boolean, modelValue: { default: () => [] } },
  emits: ['apply', 'close'],
  setup(props) {
    const { user } = useAuth();
    const dialog = ref(null);
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
    let focus;
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
    function toggle(entry) {
      if (props.readonly) return;
      try {
        selected.value = selected.value.some(item => item.id === entry.id)
          ? selected.value.filter(item => item.id !== entry.id) : projectFonts([...selected.value, fontEntry(entry)]);
      } catch (exception) { failure(exception); }
    }
    function downloadManifest() { downloadText('fonts.json', JSON.stringify(selected.value, null, 2)); }
    function downloadLinks() { downloadText('fonts.html', links.value, 'text/html'); }
    function cancel(event) { if (busy.value) event.preventDefault(); }
    onMounted(() => { focus = document.activeElement; dialog.value.showModal(); load(); });
    onBeforeUnmount(() => { disposed = true; request++; clearTimeout(timer); dialog.value?.close(); if (focus?.isConnected) focus.focus(); });
    return { ...useTranslation(), user, titleId: useId(), dialog, entries, search, page, hasMore, selected, links, family, link, editing, error, busy, loading, resetForm, suggest, edit, save, archive, toggle, downloadManifest, downloadLinks, cancel };
  }
});
</script>
