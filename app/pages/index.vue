<template>
  <div class="flex flex-col min-h-full">
    <!-- Sticky toolbar, like Figma's file browser. -->
    <header class="sticky top-0 z-20 border-b-slim border-zaux-light-grey bg-zaux-light">
      <div class="flex min-h-[52px] flex-wrap items-center gap-1 px-3 pb-1 pt-2 max-[700px]:px-1.5">
        <div class="flex items-baseline min-w-0 gap-1 mr-auto">
          <h1 tabindex="-1" class="truncate text-[16px] font-semibold">{{ translate('zx_builder_projects') }}</h1>
          <span v-if="!loading" class="text-[11px] text-zaux-dark-grey">{{ projects.length }}</span>
        </div>
        <BuilderInput v-model="search" type="search" :label="translate('zx_builder_hub_search')" :placeholder="translate('zx_builder_hub_search')"
          class="w-[280px] [&_*]:!py-1 max-w-full !bg-zaux-white max-[700px]:w-full max-[700px]:order-last" />
        <BuilderButton variant="light1" icon="refresh" iconOnly :label="translate('zx_builder_hub_refresh')" :disabled="loading || busy" @click="loadProjects" />
      </div>
      <div class="flex flex-wrap items-center gap-1 px-3 pb-1 max-[700px]:px-1.5">
        <div class="flex gap-[2px] rounded-xxs bg-zaux-white p-[2px]" role="group" :aria-label="translate('zx_builder_hub_filter')">
          <button v-for="option in filterOptions" :key="option" type="button"
            class="rounded-xxs px-1 py-0.25 text-[11px] font-semibold focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
            :class="filter === option ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
            :aria-pressed="filter === option" @click="filter = option">
            {{ translate('zx_builder_hub_filter_' + option) }}
          </button>
        </div>
        <div class="flex gap-1 ml-auto items-stretch pb-2">
          <BuilderInput v-model="sort" type="select" :label="translate('zx_builder_hub_sort')"
            :options="[{ value: 'recent', label: translate('zx_builder_hub_sort_recent') }, { value: 'name', label: translate('zx_builder_hub_sort_name') }]"
            class="!w-auto !bg-zaux-white h-full !text-[11px]" />
          <div class="flex gap-[2px] rounded-xxs bg-zaux-white p-[2px]" role="group" :aria-label="translate('zx_builder_hub_view')">
            <BuilderButton v-for="option in ['grid', 'list']" :key="option" size="xs" variant="alt1"
              :icon="option === 'grid' ? 'visualization-grid' : 'visualization-list'" iconOnly
              :label="translate('zx_builder_hub_view_' + option)" :aria-pressed="view === option"
              :extraProps="{ inheritedUIFlags: { HOVER: view === option } }" @click="view = option" />
          </div>
        </div>
      </div>
    </header>

    <div class="flex-1 px-3 py-2 max-[700px]:px-1.5">
      <p class="mb-2 text-[12px] text-zaux-dark-grey">{{ translate('zx_builder_hub_intro') }}</p>
      <p v-if="error" role="alert" class="flex items-center gap-1 p-1.5 mb-2 rounded-xs bg-utility-error/10 text-utility-error">
        <span class="flex-1">{{ translate(error) }}</span>
        <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_hub_refresh')" :disabled="loading || busy" @click="loadProjects" />
      </p>

      <!-- Loading placeholders keep the grid stable while projects arrive. -->
      <div v-if="loading">
        <p role="status" class="sr-only">{{ translate('zx_builder_loading') }}</p>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2" aria-hidden="true">
          <div v-for="index in 6" :key="index" class="animate-pulse">
            <div class="rounded-xs bg-zaux-white aspect-16-9" />
            <div class="mt-1 h-[10px] w-2/3 rounded-xxs bg-zaux-white" />
            <div class="mt-0.5 h-[8px] w-1/3 rounded-xxs bg-zaux-white" />
          </div>
        </div>
      </div>

      <div v-else-if="!projects.length && !error" class="max-w-[520px] p-4 mx-auto mt-4 text-center border-dashed rounded-s border-slim border-zaux-light-grey bg-zaux-white">
        <img :src="studioLogo" alt="" class="mx-auto mb-2 h-[40px] w-[40px] opacity-60" />
        <h2 class="mb-1 text-[16px] font-semibold">{{ translate('zx_builder_hub_empty') }}</h2>
        <p class="mb-3 text-zaux-dark-grey">{{ translate('zx_builder_hub_empty_hint') }}</p>
        <NuxtLink to="/editor/local" class="inline-flex items-center gap-1 rounded-xxs bg-zaux-accent px-2 py-1 text-[12px] font-semibold text-zaux-white hover:bg-zaux-dark-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaux-accent">
          {{ translate('zx_builder_hub_local') }}
        </NuxtLink>
      </div>

      <p v-else-if="projects.length && !visibleProjects.length" role="status" class="py-6 text-center text-zaux-dark-grey">{{ translate('zx_builder_hub_empty_search') }}</p>

      <!-- Grid view. -->
      <ul v-else-if="view === 'grid'" role="list" class="m-0 grid list-none grid-cols-6 gap-2 p-0">
        <li v-if="showLocalTile" class="min-w-0">
          <NuxtLink to="/editor/local" class="flex flex-col items-center justify-center w-full gap-1 p-2 text-center border-dashed group aspect-16-9 rounded-xs border-slim border-zaux-light-grey text-zaux-dark-grey hover:border-zaux-accent hover:text-zaux-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent">
            <Icon iconName="tech" size="text-icon-s" aria-hidden="true" />
            <span class="text-[12px] font-semibold">{{ translate('zx_builder_hub_local') }}</span>
            <span class="text-[10px]">{{ translate('zx_builder_hub_local_hint') }}</span>
          </NuxtLink>
        </li>
        <li v-for="project in visibleProjects" :key="project.id" class="min-w-0">
          <article class="flex flex-col min-w-0 group">
            <NuxtLink :to="'/editor/' + project.id" tabindex="-1" aria-hidden="true"
              class="relative flex items-center justify-center overflow-hidden transition-shadow aspect-16-9 rounded-xs border-slim border-zaux-light-grey bg-zaux-white group-hover:border-zaux-accent group-hover:shadow-sm">
              <img v-if="project.cover_image" :src="project.cover_image" alt="" loading="lazy" class="object-cover w-full h-full" />
              <img v-else :src="studioLogo" alt="" class="h-[36px] w-[36px] opacity-40" />
              <span class="absolute left-1 top-1 rounded-xxs bg-zaux-white/90 px-0.5 py-0.25 text-[9px] font-semibold uppercase tracking-wide text-zaux-dark-grey">
                {{ translate('zx_builder_hub_role_' + project.role) }}
              </span>
            </NuxtLink>
            <div class="flex items-start gap-0.5 pt-1">
              <div class="flex-1 min-w-0">
                <h2 class="truncate text-[12px] font-semibold" :title="project.name">
                  <NuxtLink :to="'/editor/' + project.id" class="rounded-xxs hover:text-zaux-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
                    :aria-label="translate('zx_builder_hub_open') + ': ' + project.name">{{ project.name }}</NuxtLink>
                </h2>
                <p class="truncate text-[10px] text-zaux-dark-grey" :title="formatDate(project.updated_at)">
                  {{ translate('zx_builder_hub_updated', { date: relativeDate(project.updated_at) }) }}
                </p>
              </div>
              <BuilderDropdown :label="translate('zx_builder_hub_project_actions', { name: project.name })" icon="more-horizontal" iconOnly btnTheme="alt1" align="end"
                :extraTriggerProps="{ iconName: 'more-horizontal', hasIcon: true, actionIcon: false }"
                :items="projectItems(project)" :disabled="busy" @select="projectAction($event, project)" />
            </div>
          </article>
        </li>
      </ul>

      <!-- List view. -->
      <div v-else role="table" :aria-label="translate('zx_builder_projects')" class="overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white">
        <div role="row" class="grid grid-cols-[64px_minmax(0,1fr)_140px_180px_40px] items-center gap-1.5 border-b-slim border-zaux-light-grey px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zaux-dark-grey max-[800px]:grid-cols-[64px_minmax(0,1fr)_40px]">
          <span role="columnheader" class="sr-only">{{ translate('zx_builder_hub_col_cover') }}</span>
          <span role="columnheader" class="col-start-2">{{ translate('zx_builder_hub_col_name') }}</span>
          <span role="columnheader" class="max-[800px]:hidden">{{ translate('zx_builder_hub_col_access') }}</span>
          <span role="columnheader" class="max-[800px]:hidden">{{ translate('zx_builder_hub_col_updated') }}</span>
          <span role="columnheader" class="sr-only">{{ translate('zx_builder_hub_col_actions') }}</span>
        </div>
        <div v-for="project in visibleProjects" :key="project.id" role="row"
          class="grid grid-cols-[64px_minmax(0,1fr)_140px_180px_40px] items-center gap-1.5 border-b-slim border-zaux-light-grey px-1.5 py-2 last:border-b-0 hover:bg-zaux-light/60 max-[800px]:grid-cols-[64px_minmax(0,1fr)_40px]">
          <span role="cell" class="flex h-[36px] w-[64px] items-center justify-center overflow-hidden rounded-xxs bg-zaux-light" aria-hidden="true">
            <img v-if="project.cover_image" :src="project.cover_image" alt="" loading="lazy" class="object-cover w-full h-full" />
            <img v-else :src="studioLogo" alt="" class="h-[18px] w-[18px] opacity-40" />
          </span>
          <span role="cell" class="min-w-0">
            <NuxtLink :to="'/editor/' + project.id" class="block truncate rounded-xxs text-[12px] font-semibold hover:text-zaux-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
              :title="project.name" :aria-label="translate('zx_builder_hub_open') + ': ' + project.name">{{ project.name }}</NuxtLink>
            <span class="hidden truncate text-[10px] text-zaux-dark-grey max-[800px]:block">{{ translate('zx_builder_hub_role_' + project.role) }} · {{ relativeDate(project.updated_at) }}</span>
          </span>
          <span role="cell" class="truncate text-[11px] text-zaux-dark-grey max-[800px]:hidden">{{ translate('zx_builder_hub_role_' + project.role) }}</span>
          <span role="cell" class="truncate text-[11px] text-zaux-dark-grey max-[800px]:hidden" :title="formatDate(project.updated_at)">{{ relativeDate(project.updated_at) }}</span>
          <span role="cell" class="flex justify-end">
            <BuilderDropdown :label="translate('zx_builder_hub_project_actions', { name: project.name })" icon="more-horizontal" iconOnly btnTheme="alt1" align="end"
              :extraTriggerProps="{ iconName: 'more-horizontal', hasIcon: true, actionIcon: false }"
              :items="projectItems(project)" :disabled="busy" @select="projectAction($event, project)" />
          </span>
        </div>
      </div>
    </div>
    <ProjectActionDialog v-if="action" :project="action.project" :action="action.type" :busy="busy" :error="actionError" @submit="submitAction" @close="action = null" />
  </div>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth.js';
import { useTranslation } from '../composables/useTranslation.js';
import { listRemoteProjects, renameRemoteProject, deleteRemoteProject, duplicateRemoteProject } from '../services/projects.js';
import { readHubPreferences, saveHubPreferences } from '../services/layout-preferences.js';
import studioLogo from '../assets/images/logo-studio.svg?url';

const FILTERS = ['all', 'owned', 'shared'];
const canEdit = project => ['owner', 'editor'].includes(project.role);

definePageMeta({ layout: 'hub' });
export default defineComponent({
  setup() {
    const router = useRouter();
    const { user } = useAuth();
    const { translate, language } = useTranslation();
    const projects = ref([]);
    const search = ref('');
    const preferences = readHubPreferences();
    const filter = ref(FILTERS.includes(preferences.filter) ? preferences.filter : 'all');
    const sort = ref(preferences.sort === 'name' ? 'name' : 'recent');
    const view = ref(preferences.view === 'list' ? 'list' : 'grid');
    watch([filter, sort, view], () => saveHubPreferences({ filter: filter.value, sort: sort.value, view: view.value }));
    const visibleProjects = computed(() => {
      const query = search.value.trim().toLocaleLowerCase(language.value);
      const list = projects.value.filter(project =>
        (filter.value === 'all' || (filter.value === 'owned') === (project.role === 'owner'))
        && (!query || (project.name ?? '').toLocaleLowerCase(language.value).includes(query)));
      return sort.value === 'name'
        ? [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', language.value, { sensitivity: 'base' }))
        : [...list].sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0));
    });
    // The local workspace is a starting point, so it only leads the unfiltered grid.
    const showLocalTile = computed(() => filter.value === 'all' && !search.value.trim());
    const loading = ref(true);
    const error = ref('');
    const action = ref(null);
    const actionError = ref('');
    const busy = ref(false);
    let disposed = false;
    async function loadProjects() {
      loading.value = true;
      error.value = '';
      try {
        const result = await listRemoteProjects(user.value.id);
        if (!disposed) projects.value = result;
      } catch { if (!disposed) error.value = 'zx_builder_hub_load_error'; }
      finally { if (!disposed) loading.value = false; }
    }
    async function duplicateProject(project) {
      if (busy.value || loading.value || !canEdit(project)) return;
      busy.value = true;
      error.value = '';
      try {
        const copy = await duplicateRemoteProject(project.id, translate('zx_builder_copy_suffix'), user.value.id);
        if (disposed) return;
        search.value = '';
        projects.value = [copy, ...projects.value];
      } catch { if (!disposed) error.value = 'zx_builder_hub_action_error'; }
      finally { if (!disposed) busy.value = false; }
    }
    function openAction(type, project) {
      if (busy.value) return;
      actionError.value = '';
      action.value = { type, project: { ...project } };
    }
    function projectItems(project) {
      return [
        { id: 'open', label: translate('zx_builder_hub_open'), icon: 'arrow-up-right' },
        { id: 'duplicate', label: translate('zx_builder_duplicate'), icon: 'duplicate', separator: true, hidden: !canEdit(project), disabled: loading.value },
        { id: 'rename', label: translate('zx_builder_rename_project'), icon: 'edit', hidden: !canEdit(project) },
        { id: 'delete', label: translate('zx_builder_delete_project'), icon: 'delete', danger: true, separator: true, hidden: project.role !== 'owner' }
      ];
    }
    function projectAction(item, project) {
      if (item.id === 'open') router.push('/editor/' + project.id);
      else if (item.id === 'duplicate') duplicateProject(project);
      else openAction(item.id, project);
    }
    async function submitAction(name) {
      if (busy.value || !action.value) return;
      const { type, project } = action.value;
      if (!canEdit(project) || (type === 'delete' && project.role !== 'owner')) return;
      busy.value = true;
      actionError.value = '';
      try {
        const result = type === 'rename' ? await renameRemoteProject(project, name) : await deleteRemoteProject(project);
        if (disposed) return;
        if (!result) {
          await loadProjects();
          if (disposed) return;
          action.value = null;
          error.value ||= 'zx_builder_project_changed';
          return;
        }
        projects.value = type === 'rename'
          ? projects.value.map(item => item.id === project.id ? { ...item, ...result } : item)
          : projects.value.filter(item => item.id !== project.id);
        action.value = null;
      } catch { if (!disposed) actionError.value = 'zx_builder_hub_action_error'; }
      finally { if (!disposed) busy.value = false; }
    }
    function formatDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(language.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
    const RELATIVE_UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    // "2 hours ago" for recent edits; the exact date stays in the title.
    function relativeDate(value) {
      const time = Date.parse(value);
      if (Number.isNaN(time)) return '';
      const seconds = Math.round((time - Date.now()) / 1000);
      const format = new Intl.RelativeTimeFormat(language.value, { numeric: 'auto' });
      const [unit, size] = RELATIVE_UNITS.find(([, length]) => Math.abs(seconds) >= length) ?? ['second', 1];
      return unit === 'second' ? format.format(0, 'second') : format.format(Math.round(seconds / size), unit);
    }
    onMounted(loadProjects);
    onBeforeUnmount(() => { disposed = true; });
    return { studioLogo, translate, projects, search, filter, filterOptions: FILTERS, sort, view, visibleProjects, showLocalTile, loading, error, action, actionError, busy, loadProjects, projectItems, projectAction, submitAction, formatDate, relativeDate };
  }
});
</script>
