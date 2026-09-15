<template>
  <div>
    <header class="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div>
        <p class="mb-1 text-[11px] uppercase tracking-wider text-zaux-dark-grey">ZAUX STUDIO</p>
        <h1 tabindex="-1" class="text-[28px] font-medium">{{ translate('zx_builder_projects') }}</h1>
        <p class="mt-1 text-[13px] text-zaux-dark-grey">{{ translate('zx_builder_hub_intro') }}</p>
      </div>
      <BuilderButton variant="outlined" :label="translate('zx_builder_hub_refresh')" :disabled="loading || busy" @click="loadProjects" />
    </header>
    <BuilderInput v-model="search" type="search" :label="translate('zx_builder_hub_search')" :placeholder="translate('zx_builder_hub_search')" class="w-full mb-3 bg-zaux-white" />
    <p v-if="error" role="alert" class="p-2 mb-3 rounded-xs bg-utility-error/10 text-utility-error">{{ translate(error) }}</p>
    <p v-if="loading" role="status" class="py-6 text-zaux-dark-grey">{{ translate('zx_builder_loading') }}</p>
    <div v-else-if="!projects.length && !error" class="p-6 text-center rounded-s border-slim border-zaux-light-grey bg-zaux-white">
      <h2 class="mb-1 text-[18px] font-medium">{{ translate('zx_builder_hub_empty') }}</h2>
      <p class="mb-3 text-zaux-dark-grey">{{ translate('zx_builder_hub_empty_hint') }}</p>
      <NuxtLink to="/editor/local" class="underline text-zaux-accent">{{ translate('zx_builder_hub_local') }}</NuxtLink>
    </div>
    <p v-else-if="projects.length && !filteredProjects.length" role="status" class="py-6 text-zaux-dark-grey">{{ translate('zx_builder_hub_empty_search') }}</p>
    <div v-else class="grid grid-cols-1 gap-3 min-[800px]:grid-cols-2 min-[1300px]:grid-cols-5">
      <article v-for="project in filteredProjects" :key="project.id" class="flex flex-col min-w-0 p-3 rounded-s bg-zaux-white">
        <NuxtLink :to="'/editor/' + project.id" class="flex-1 block mb-3 rounded-xxs focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent">
          <div class="flex items-center justify-center mb-3 aspect-16-9 rounded-xs bg-zaux-light" aria-hidden="true">
            <img v-if="project.cover_image" :src="project.cover_image" alt="" loading="lazy" class="object-cover w-full h-full rounded-xs aspect-16-9" />
            <img v-else :src="studioLogo" alt="" class="h-[40px] w-[40px] opacity-60" />
          </div>
          <h2 class="break-words text-[18px] font-medium">{{ project.name }}</h2>
          <p class="mt-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_hub_role_' + project.role) }}</p>
          <p class="mt-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_hub_updated', { date: formatDate(project.updated_at) }) }}</p>
        </NuxtLink>
        <div class="flex flex-wrap items-center gap-1">
          <NuxtLink :to="'/editor/' + project.id" class="py-1 mr-auto underline rounded-xxs text-zaux-accent">
            {{ translate('zx_builder_hub_open') }}
          </NuxtLink>
          <BuilderButton v-if="['owner', 'editor'].includes(project.role)" icon="duplicate" iconOnly
            :label="translate('zx_builder_duplicate') + ': ' + project.name" :disabled="busy || loading"
            @click="duplicateProject(project)" />
          <BuilderButton v-if="['owner', 'editor'].includes(project.role)" icon="edit" iconOnly :label="translate('zx_builder_rename_project')" :disabled="busy" @click="openAction('rename', project)" />
          <BuilderButton v-if="project.role === 'owner'" icon="delete" iconOnly :label="translate('zx_builder_delete_project')" :disabled="busy" @click="openAction('delete', project)" />
        </div>
      </article>
    </div>
    <ProjectActionDialog v-if="action" :project="action.project" :action="action.type" :busy="busy" :error="actionError" @submit="submitAction" @close="action = null" />
  </div>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useAuth } from '../composables/useAuth.js';
import { useTranslation } from '../composables/useTranslation.js';
import { listRemoteProjects, renameRemoteProject, deleteRemoteProject, duplicateRemoteProject } from '../services/projects.js';
import studioLogo from '../assets/images/logo-studio.svg?url';
import BuilderButton from '../components/builder/BuilderButton.vue';
import BuilderInput from '../components/builder/fields/BuilderInput.vue';
import ProjectActionDialog from '../components/studio/ProjectActionDialog.vue';

definePageMeta({ layout: 'hub' });
export default defineComponent({
  components: { BuilderButton, BuilderInput, ProjectActionDialog },
  setup() {
    const { user } = useAuth();
    const { translate, language } = useTranslation();
    const projects = ref([]);
    const search = ref('');
    const filteredProjects = computed(() => {
      const query = search.value.trim().toLocaleLowerCase(language.value);
      return query
        ? projects.value.filter(project => (project.name ?? '').toLocaleLowerCase(language.value).includes(query))
        : projects.value;
    });
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
      if (busy.value || loading.value || !['owner', 'editor'].includes(project.role)) return;
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
    async function submitAction(name) {
      if (busy.value || !action.value) return;
      const { type, project } = action.value;
      if (!['owner', 'editor'].includes(project.role) || (type === 'delete' && project.role !== 'owner')) return;
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
    onMounted(loadProjects);
    onBeforeUnmount(() => { disposed = true; });
    return { studioLogo, translate, projects, search, filteredProjects, loading, error, action, actionError, busy, loadProjects, duplicateProject, openAction, submitAction, formatDate };
  }
});
</script>
