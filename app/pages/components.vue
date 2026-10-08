<template>
  <div class="flex flex-col min-h-full">
    <!-- Global library management: the only place where global thumbnails are generated. -->
    <header class="sticky top-0 z-20 border-b-slim border-zaux-light-grey bg-zaux-light">
      <div class="flex min-h-[52px] flex-wrap items-center gap-1 px-3 pb-1 pt-2 max-[700px]:px-1.5">
        <div class="flex items-baseline min-w-0 gap-1 mr-auto">
          <h1 tabindex="-1" class="truncate text-[16px] font-semibold">{{ translate('zx_builder_global_designer') }}</h1>
          <span v-if="!loading" class="text-[11px] text-zaux-dark-grey">{{ rows.length }}</span>
        </div>
        <BuilderInput v-model="search" type="search" :label="translate('zx_builder_global_search')" :placeholder="translate('zx_builder_global_search')"
          class="w-[280px] [&_*]:!py-1 max-w-full !bg-zaux-white max-[700px]:w-full max-[700px]:order-last" />
        <BuilderButton variant="light" icon="refresh" iconOnly :label="translate('zx_builder_hub_refresh')" :disabled="loading || busy" @click="load" />
        <NuxtLink to="/designer" class="inline-flex items-center gap-1 rounded-xxs bg-zaux-accent px-2 py-1 text-[12px] font-semibold text-zaux-white hover:bg-zaux-dark-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaux-accent">
          {{ translate('zx_builder_global_open_designer') }}
        </NuxtLink>
      </div>
      <div class="flex flex-wrap items-center gap-1 px-3 pb-2 max-[700px]:px-1.5">
        <div class="flex gap-[2px] rounded-xxs bg-zaux-white p-[2px]" role="group" :aria-label="translate('zx_builder_hub_filter')">
          <button v-for="option in ['all', 'zvc', 'zvp']" :key="option" type="button"
            class="rounded-xxs px-1 py-0.25 text-[11px] font-semibold focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
            :class="kind === option ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
            :aria-pressed="kind === option" @click="kind = option">
            {{ option === 'all' ? translate('zx_builder_global_kind_all') : option.toUpperCase() }}
          </button>
        </div>
        <span class="ml-auto text-[11px] text-zaux-dark-grey" role="status">
          {{ batch.running ? translate('zx_builder_global_thumbnail_progress', { done: batch.done, total: batch.total }) : '' }}
        </span>
        <BuilderButton size="xs" icon="refresh" :label="translate('zx_builder_global_thumbnail_missing')"
          :disabled="loading || busy || !rows.some(row => !row.thumbnail)" @click="generateAll(true)" />
        <BuilderButton size="xs" variant="light" :label="translate('zx_builder_thumbnails_all')"
          :disabled="loading || busy || !rows.length" @click="generateAll(false)" />
      </div>
    </header>

    <div class="flex-1 px-3 py-2 max-[700px]:px-1.5">
      <p class="mb-2 text-[12px] text-zaux-dark-grey">{{ translate('zx_builder_global_hub_intro') }}</p>
      <p v-if="error" role="alert" class="flex items-center gap-1 p-1.5 mb-2 rounded-xs bg-utility-error/10 text-utility-error">
        <span class="flex-1">{{ translate(error) }}</span>
        <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_hub_refresh')" :disabled="loading || busy" @click="load" />
      </p>

      <div v-if="loading" class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2" aria-hidden="true">
        <div v-for="index in 6" :key="index" class="animate-pulse">
          <div class="rounded-xs bg-zaux-white aspect-16-9" />
          <div class="mt-1 h-[10px] w-2/3 rounded-xxs bg-zaux-white" />
        </div>
      </div>

      <div v-else-if="!rows.length && !error" class="max-w-[520px] p-4 mx-auto mt-4 text-center border-dashed rounded-s border-slim border-zaux-light-grey bg-zaux-white">
        <h2 class="mb-1 text-[16px] font-semibold">{{ translate('zx_builder_global_empty') }}</h2>
        <p class="mb-3 text-zaux-dark-grey">{{ translate('zx_builder_global_empty_hint') }}</p>
        <NuxtLink to="/designer" class="inline-flex items-center gap-1 rounded-xxs bg-zaux-accent px-2 py-1 text-[12px] font-semibold text-zaux-white hover:bg-zaux-dark-accent">
          {{ translate('zx_builder_global_open_designer') }}
        </NuxtLink>
      </div>

      <p v-else-if="rows.length && !visibleRows.length" role="status" class="py-6 text-center text-zaux-dark-grey">{{ translate('zx_builder_hub_empty_search') }}</p>

      <ul v-else role="list" class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2 p-0">
        <li v-for="row in visibleRows" :key="row.id" class="min-w-0">
          <article class="flex flex-col min-w-0 group">
            <NuxtLink :to="'/designer?component=' + row.id" tabindex="-1" aria-hidden="true"
              class="relative flex items-center justify-center overflow-hidden transition-shadow aspect-16-9 rounded-xs border-slim border-zaux-light-grey bg-zaux-white group-hover:border-zaux-accent group-hover:shadow-sm"
              :aria-busy="working.has(row.id)">
              <img v-if="row.thumbnail" draggable="false" :src="row.thumbnail" alt="" loading="lazy" class="object-contain w-full h-full" />
              <span v-else class="px-2 text-center text-[11px] text-zaux-dark-grey">
                {{ translate(working.has(row.id) ? 'zx_builder_thumbnail_loading' : failed.has(row.id) ? 'zx_builder_global_thumbnail_error' : 'zx_builder_global_no_thumbnail') }}
              </span>
              <span class="absolute left-1 top-1 rounded-xxs bg-zaux-white/90 px-0.5 py-0.25 font-mono text-[9px] font-semibold text-zaux-dark-grey">{{ row.kind.toUpperCase() }}</span>
              <span class="absolute right-1 top-1 rounded-xxs px-0.5 py-0.25 font-mono text-[9px]"
                :class="compatible(row) ? 'bg-zaux-white/90 text-zaux-dark-grey' : 'bg-utility-warning/80 text-zaux-dark'"
                :title="translate(compatible(row) ? 'zx_builder_global_version_match' : 'zx_builder_global_version_mismatch')">
                {{ translate('zx_builder_global_signed', { version: row.zaux_version }) }}
              </span>
            </NuxtLink>
            <div class="flex items-start gap-0.5 pt-1">
              <div class="flex-1 min-w-0">
                <h2 class="truncate text-[12px] font-semibold" :title="row.name">
                  <NuxtLink :to="'/designer?component=' + row.id" class="rounded-xxs hover:text-zaux-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
                    :aria-label="translate('zx_builder_global_edit') + ': ' + row.name">{{ row.name }}</NuxtLink>
                </h2>
                <p class="truncate font-mono text-[9px] text-zaux-dark-grey">{{ row.export_name }} · {{ translate('zx_builder_global_revision', { revision: row.revision }) }}</p>
                <p class="truncate text-[10px] text-zaux-dark-grey" :title="formatDate(row.updated_at)">{{ translate('zx_builder_hub_updated', { date: relativeDate(row.updated_at) }) }}</p>
              </div>
              <BuilderDropdown :label="translate('zx_builder_global_actions', { name: row.name })" icon="more-horizontal" iconOnly btnTheme="alt1" align="end"
                :extraTriggerProps="{ iconName: 'more-horizontal', hasIcon: true, actionIcon: false }"
                :items="rowItems(row)" :disabled="busy" @select="rowAction($event, row)" />
            </div>
          </article>
        </li>
      </ul>
    </div>
    <BuilderModal v-if="removing" :title="translate('zx_builder_global_delete')" :subtitle="removing.name" size="sm" :busy="busy" @close="removing = null">
      <p class="text-[12px] leading-[1.7] text-zaux-dark-grey">{{ translate('zx_builder_global_delete_confirm', { name: removing.name }) }}</p>
      <template #footer>
        <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_cancel')" :disabled="busy" @click="removing = null" />
        <BuilderButton size="xs" variant="primary" :label="translate('zx_builder_delete')" :disabled="busy" @click="archive" />
      </template>
    </BuilderModal>
  </div>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTranslation } from '../composables/useTranslation.js';
import { archiveGlobalComponent, getGlobalComponent, listGlobalComponents, saveGlobalThumbnail } from '../services/global-components.js';
import { createLibraryThumbnailRenderer } from '../services/library-thumbnails.js';
import { libraryThumbnailState } from '../../domain/library-thumbnail.js';
import { globalDefinition, zauxCompatibility } from '../../domain/global-components.js';
import { clone } from '../../domain/nodes.js';
import { zauxProjectVersion } from '../../integrations/zaux/version.js';
import stylePreset from '../data/styles/preset.js';

definePageMeta({ layout: 'hub' });
export default defineComponent({
  setup() {
    const router = useRouter();
    const { translate, language } = useTranslation();
    const rows = ref([]);
    const loading = ref(true);
    const busy = ref(false);
    const error = ref('');
    const search = ref('');
    const kind = ref('all');
    const removing = ref(null);
    const working = ref(new Set());
    const failed = ref(new Set());
    const batch = ref({ running: false, done: 0, total: 0 });
    const renderer = createLibraryThumbnailRenderer();
    let disposed = false;
    const visibleRows = computed(() => {
      const query = search.value.trim().toLocaleLowerCase(language.value);
      return rows.value.filter(row => (kind.value === 'all' || row.kind === kind.value)
        && (!query || [row.name, row.export_name].some(value => value.toLocaleLowerCase(language.value).includes(query))));
    });
    const compatible = row => zauxCompatibility(row.zaux_version, zauxProjectVersion).match;
    async function load() {
      loading.value = true; error.value = '';
      try { const result = await listGlobalComponents({ thumbnails: true }); if (!disposed) rows.value = result; }
      catch { if (!disposed) error.value = 'zx_builder_global_load_error'; }
      finally { if (!disposed) loading.value = false; }
    }
    function mark(set, id, value) {
      const next = new Set(set.value);
      if (value) next.add(id); else next.delete(id);
      set.value = next;
    }
    // Renders with the default Zaux style preset, so thumbnails do not depend on any project's tokens.
    async function generate(row) {
      mark(working, row.id, true); mark(failed, row.id, false);
      try {
        const full = await getGlobalComponent(row.id);
        if (!full || full.archived_at) throw new Error('zx_builder_global_missing');
        const state = libraryThumbnailState(globalDefinition(full), { styles: clone(stylePreset), componentThemes: [] }, language.value);
        const url = await renderer.render(JSON.stringify(['global', row.id, full.revision, language.value]), state, { force: true });
        await saveGlobalThumbnail(row.id, url);
        if (!disposed) row.thumbnail = url;
        return true;
      } catch {
        if (!disposed) mark(failed, row.id, true);
        return false;
      } finally { if (!disposed) mark(working, row.id, false); }
    }
    async function generateAll(missingOnly) {
      if (busy.value) return;
      const targets = rows.value.filter(row => !missingOnly || !row.thumbnail);
      busy.value = true;
      batch.value = { running: true, done: 0, total: targets.length };
      try {
        for (const row of targets) {
          if (disposed) break;
          await generate(row);
          batch.value = { ...batch.value, done: batch.value.done + 1 };
        }
      } finally { if (!disposed) { busy.value = false; batch.value = { ...batch.value, running: false }; } }
    }
    async function removeThumbnail(row) {
      busy.value = true;
      try { await saveGlobalThumbnail(row.id, null); if (!disposed) row.thumbnail = null; }
      catch { if (!disposed) error.value = 'zx_builder_hub_action_error'; }
      finally { if (!disposed) busy.value = false; }
    }
    async function archive() {
      const row = removing.value;
      if (!row || busy.value) return;
      busy.value = true;
      try {
        const result = await archiveGlobalComponent(row.id, row.revision);
        if (disposed) return;
        if (!result) { error.value = 'zx_builder_global_conflict'; await load(); }
        else rows.value = rows.value.filter(item => item.id !== row.id);
        removing.value = null;
      } catch { if (!disposed) error.value = 'zx_builder_hub_action_error'; }
      finally { if (!disposed) busy.value = false; }
    }
    function rowItems(row) {
      return [
        { id: 'edit', label: translate('zx_builder_global_edit'), icon: 'enter' },
        { id: 'thumbnail', label: translate('zx_builder_global_thumbnail_generate'), icon: 'refresh', separator: true, disabled: working.value.has(row.id) },
        { id: 'thumbnail-remove', label: translate('zx_builder_global_thumbnail_remove'), hidden: !row.thumbnail },
        { id: 'delete', label: translate('zx_builder_global_delete'), icon: 'delete', danger: true, separator: true }
      ];
    }
    function rowAction(item, row) {
      if (item.id === 'edit') router.push('/designer?component=' + row.id);
      else if (item.id === 'thumbnail') generate(row);
      else if (item.id === 'thumbnail-remove') removeThumbnail(row);
      else if (item.id === 'delete') removing.value = row;
    }
    function formatDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(language.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
    const RELATIVE_UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    function relativeDate(value) {
      const time = Date.parse(value);
      if (Number.isNaN(time)) return '';
      const seconds = Math.round((time - Date.now()) / 1000);
      const format = new Intl.RelativeTimeFormat(language.value, { numeric: 'auto' });
      const [unit, size] = RELATIVE_UNITS.find(([, length]) => Math.abs(seconds) >= length) ?? ['second', 1];
      return unit === 'second' ? format.format(0, 'second') : format.format(Math.round(seconds / size), unit);
    }
    onMounted(load);
    onBeforeUnmount(() => { disposed = true; renderer.dispose(); });
    return { translate, rows, loading, busy, error, search, kind, removing, working, failed, batch, visibleRows, compatible, load, generateAll, archive, rowItems, rowAction, formatDate, relativeDate };
  }
});
</script>
