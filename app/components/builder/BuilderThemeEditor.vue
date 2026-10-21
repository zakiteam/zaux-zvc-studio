<template>
  <div class="flex min-h-0 flex-1 bg-zaux-light max-[900px]:flex-col">
    <!-- Sidebar: project-wide CSS, component list and bulk exports. -->
    <aside class="flex w-[280px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white max-[900px]:max-h-[280px] max-[900px]:w-full">
      <div class="shrink-0 space-y-1.5 border-b-slim border-zaux-light-grey p-2">
        <h1 class="text-[13px] font-semibold">{{ translate('zx_builder_theme_editor') }}</h1>
        <p v-if="designer" class="rounded-xxs bg-utility-warning/20 p-1 text-[11px] leading-[1.6]" role="note">{{ translate('zx_builder_global_tokens_hint') }}</p>
        <BuilderInput v-model="search" :label="translate('zx_builder_theme_search')" :placeholder="translate('zx_builder_theme_search')" class="w-full" />
      </div>
      <nav class="min-h-0 flex-1 overflow-auto px-1 pb-2" :aria-label="translate('zx_builder_theme_components')">
        <h2 class="px-1 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_theme_project_section') }}</h2>
        <button type="button" class="flex w-full items-center gap-1 rounded-xxs px-1.5 py-1 text-left hover:bg-zaux-light"
          :class="scope === 'project' ? 'bg-zaux-light' : ''" :aria-pressed="scope === 'project'" @click="scope = 'project'">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[12px]" :class="scope === 'project' ? 'font-semibold text-zaux-accent' : ''">{{ translate('zx_builder_theme_project_styles') }}</span>
            <span class="block truncate font-mono text-[10px] text-zaux-dark-grey">project-styles.css</span>
          </span>
          <span v-if="projectDirty" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-utility-warning"
            :title="translate('zx_builder_theme_unsaved')" :aria-label="translate('zx_builder_theme_unsaved')" />
          <span v-if="savedProjectCss.trim()" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-zaux-accent"
            :title="translate('zx_builder_theme_modified')" :aria-label="translate('zx_builder_theme_modified')" />
        </button>
        <h2 class="flex items-center justify-between px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
          <span>{{ translate('zx_builder_theme_components_section') }}</span>
          <span class="tracking-normal tabular-nums">{{ filteredCatalog.length }}</span>
        </h2>
        <button v-for="entry in filteredCatalog" :key="entry.id" type="button"
          class="flex w-full items-center gap-1 rounded-xxs px-1.5 py-1 text-left hover:bg-zaux-light"
          :class="isActiveComponent(entry.id) ? 'bg-zaux-light' : ''"
          :aria-pressed="isActiveComponent(entry.id)" @click="selectComponent(entry.id)">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[12px]" :class="isActiveComponent(entry.id) ? 'font-semibold text-zaux-accent' : ''">{{ entry.id }}</span>
            <span class="block truncate font-mono text-[10px] text-zaux-dark-grey">{{ entry.componentClass }}</span>
          </span>
          <span v-if="hasDraft(entry.id)" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-utility-warning"
            :title="translate('zx_builder_theme_unsaved')" :aria-label="translate('zx_builder_theme_unsaved')" />
          <span v-if="isModified(entry.id)" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-zaux-accent"
            :title="translate('zx_builder_theme_modified')" :aria-label="translate('zx_builder_theme_modified')" />
        </button>
        <p v-if="!filteredCatalog.length" class="p-2 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_no_results') }}</p>
      </nav>
      <div class="shrink-0 space-y-1 border-t-slim border-zaux-light-grey p-2">
        <h2 class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_theme_exports') }}</h2>
        <BuilderButton size="xs" icon="download" class="!w-full" :label="translate('zx_builder_theme_export_all')" :disabled="!allCss.trim()" @click="exportCss(true)" />
        <BuilderButton size="xs" icon="download" class="!w-full" :label="translate('zx_builder_theme_project_export')" :disabled="!savedProjectCss.trim()" @click="exportProjectCss" />
      </div>
    </aside>

    <main v-if="selected" class="flex min-h-0 min-w-0 flex-1 flex-col">
      <!-- Header: what is being edited, with its save and export actions. -->
      <header class="flex min-h-[56px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b-slim border-zaux-light-grey bg-zaux-white px-2 py-1">
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
            {{ translate(scope === 'project' ? 'zx_builder_theme_project_section' : 'zx_builder_theme_component_eyebrow') }}
          </p>
          <div class="flex min-w-0 items-baseline gap-1">
            <h2 class="truncate text-[15px] font-semibold">{{ scope === 'project' ? translate('zx_builder_theme_project_styles') : selected.id }}</h2>
            <code class="truncate text-[11px] text-zaux-dark-grey">{{ scope === 'project' ? 'project-styles.css' : '.' + selected.componentClass }}</code>
          </div>
          <p v-if="scope === 'component'" class="truncate font-mono text-[10px] text-zaux-dark-grey" :title="selected.source">
            {{ translate('zx_builder_theme_source') }}: {{ selected.source }}
          </p>
        </div>
        <span v-if="currentDirty" class="shrink-0 rounded-xxs bg-utility-warning/20 px-1 py-0.25 text-[11px] font-semibold">{{ translate('zx_builder_theme_unsaved') }}</span>
        <div class="flex shrink-0 flex-wrap items-center gap-1">
          <template v-if="scope === 'project'">
            <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_theme_discard')" :disabled="!projectDirty" @click="discardProjectDraft" />
            <BuilderButton size="xs" variant="primary" :label="translate('zx_builder_theme_project_save')" :disabled="!canEditRemote || !projectDirty || !validProjectDraft" @click="saveProjectStyles" />
            <BuilderButton size="xs" icon="download" :label="translate('zx_builder_theme_project_export')" :disabled="!savedProjectCss.trim()" @click="exportProjectCss" />
          </template>
          <template v-else>
            <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_theme_discard')" :disabled="!dirty" @click="discardDraft" />
            <BuilderButton size="xs" variant="primary" :label="translate('zx_builder_theme_save')" :disabled="!canEditRemote || !dirty || !validDraft" @click="saveTheme" />
            <BuilderButton size="xs" icon="download" :label="translate('zx_builder_theme_export_one')" :disabled="!savedCss.trim()" @click="exportCss(false)" />
          </template>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 max-[1100px]:flex-col max-[1100px]:overflow-auto">
        <!-- Preview: transient sample settings, live iframe and sample properties. -->
        <section class="flex min-h-0 min-w-0 flex-1 flex-col p-2 max-[1100px]:min-h-[560px]">
          <div class="mb-1 flex shrink-0 flex-wrap items-end gap-1.5 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-1.5 shadow-sm">
            <label v-if="scope === 'project'" class="flex min-w-[160px] flex-col gap-0.5">
              <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_preview_component') }}</span>
              <BuilderInput v-model="componentId" type="select" :options="componentOptions" :label="translate('zx_builder_theme_preview_component')" />
            </label>
            <label class="flex min-w-[140px] flex-col gap-0.5">
              <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_variant') }}</span>
              <BuilderInput v-model="theme" type="select" :options="themeOptions" :label="translate('zx_builder_theme_variant')" />
            </label>
            <label class="flex min-w-[96px] flex-col gap-0.5">
              <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_size') }}</span>
              <BuilderInput v-model="size" type="select" :options="sizeOptions" :label="translate('zx_builder_theme_size')" />
            </label>
            <label v-if="selected.id === 'ZButton'" class="flex min-w-[110px] flex-col gap-0.5">
              <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_state') }}</span>
              <BuilderInput v-model="sampleState" type="select" :options="stateOptions" :label="translate('zx_builder_theme_state')" />
            </label>
            <label class="flex min-w-[140px] flex-col gap-0.5">
              <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_background') }}</span>
              <BuilderInput v-model="background" type="select" :options="backgroundOptions" :label="translate('zx_builder_theme_background')" />
            </label>
            <BuilderButton v-if="sample" class="ml-auto" size="xs" variant="alt1" icon="refresh" :label="translate('zx_builder_theme_reload_preview')" @click="preview?.reload()" />
          </div>
          <p class="mb-1 shrink-0 px-0.5 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_preview_hint') }}</p>
          <template v-if="sample">
            <BuilderThemePreview ref="preview" :node="previewNode" :background="background" :themeCss="previewCss" />
            <BuilderResizeHandle v-if="propsOpen" direction="vertical" side="bottom" :label="translate('zx_builder_theme_resize_props')" @resize="resizeProps" />
            <div v-else class="h-[8px] shrink-0" />
            <BuilderThemeProps :key="componentId" class="max-h-[65%]" :modelValue="previewProps" :fields="previewConfig.fields" :open="propsOpen"
              :style="propsOpen ? { height: propsHeight + 'px' } : null" @apply="applyPreview" @toggle="propsOpen = !propsOpen" />
          </template>
          <p v-else role="status" class="rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-2">{{ translate('zx_builder_theme_preview_missing') }}</p>
        </section>

        <BuilderResizeHandle side="right" class="max-[1100px]:hidden" :label="translate('zx_builder_theme_resize_editor')" @resize="resizeEditor" />

        <!-- Editor: component theme (variables / CSS source) or project-wide CSS. -->
        <section class="flex min-h-0 shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white max-[1100px]:min-h-[520px] max-[1100px]:!w-full"
          :style="{ width: editorWidth + 'px' }">
          <template v-if="scope === 'project'">
            <div class="flex h-[40px] shrink-0 items-center border-b-slim border-zaux-light-grey px-2">
              <h3 class="text-[11px] font-semibold">{{ translate('zx_builder_theme_project_styles') }}</h3>
            </div>
            <div class="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
              <p v-if="!canEditRemote" class="text-[11px]">{{ translate('zx_builder_project_readonly') }}</p>
              <p v-if="projectError || !validProjectDraft" role="alert" class="text-[11px] text-utility-error">{{ translate(projectError || 'zx_builder_theme_invalid_css') }}</p>
              <p v-if="projectDirty" role="status" class="rounded-xxs bg-utility-warning/20 p-1 text-[11px]">{{ translate('zx_builder_theme_project_pending') }}</p>
              <p class="text-[11px] leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_theme_project_hint') }}</p>
              <div class="min-h-[240px] flex-1 overflow-hidden">
                <BuilderCodeEditor class="h-full" fill :modelValue="projectCssDraft" language="css" :label="translate('zx_builder_theme_project_styles')"
                  :readonly="!canEditRemote" :rows="12" @update:modelValue="projectDraft = $event" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex h-[40px] shrink-0 items-center gap-0.5 border-b-slim border-zaux-light-grey px-1" role="tablist" :aria-label="translate('zx_builder_theme_editor')">
              <button v-for="tab in editTabs" :key="tab.id" type="button" role="tab" :aria-selected="editMode === tab.id"
                class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
                :class="editMode === tab.id ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
                @click="editMode = tab.id">{{ translate(tab.label) }}</button>
            </div>
            <div v-if="!canEditRemote || localError || !validDraft || dirty" class="shrink-0 space-y-1 border-b-slim border-zaux-light-grey p-2">
              <p v-if="!canEditRemote" class="text-[11px]">{{ translate('zx_builder_project_readonly') }}</p>
              <p v-if="localError || !validDraft" role="alert" class="text-[11px] text-utility-error">{{ translate(localError || 'zx_builder_theme_invalid_css') }}</p>
              <p v-if="dirty" role="status" class="rounded-xxs bg-utility-warning/20 p-1 text-[11px]">{{ translate('zx_builder_theme_pending') }}</p>
            </div>
            <template v-if="editMode === 'variables'">
              <div class="shrink-0 space-y-1.5 border-b-slim border-zaux-light-grey p-2">
                <label class="flex flex-col gap-0.5">
                  <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_selector') }}</span>
                  <BuilderInput v-model="ruleKey" type="select" :options="ruleOptions" :label="translate('zx_builder_theme_selector')" class="w-full font-mono text-[11px]" />
                </label>
                <p class="break-all rounded-xxs bg-zaux-light px-1 py-0.5 font-mono text-[10px] text-zaux-dark-grey">{{ target?.selector }}</p>
                <div class="flex items-center gap-1">
                  <BuilderInput v-model="variableSearch" :label="translate('zx_builder_theme_filter_vars')" :placeholder="translate('zx_builder_theme_filter_vars')" class="min-w-0 flex-1" />
                  <BuilderButton size="xs" :variant="onlyModified ? 'primary' : 'alt1'" :label="translate('zx_builder_theme_only_modified')"
                    :aria-pressed="onlyModified" @click="onlyModified = !onlyModified" />
                </div>
                <details class="text-[11px]">
                  <summary class="cursor-pointer text-zaux-dark-grey">
                    {{ translate('zx_builder_theme_variables_count', { count: variables.length }) }} · {{ translate('zx_builder_theme_help') }}
                  </summary>
                  <p class="pt-1 leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_theme_variable_hint') }}</p>
                </details>
              </div>
              <div class="min-h-0 flex-1 overflow-auto p-2">
                <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-1">
                  <div v-for="variable in variables" :key="selected.id + ruleKey + variable.name"
                    class="min-w-0 rounded-xxs border-slim px-1.5 py-1"
                    :class="Object.hasOwn(overrides, variable.name) ? 'border-zaux-accent bg-zaux-light-accent/20' : 'border-zaux-light-grey'">
                    <div class="mb-0.5 flex min-h-[24px] items-center gap-1">
                      <label :for="'theme-var-' + variable.name" class="min-w-0 flex-1 break-all font-mono text-[11px]">{{ variable.name }}</label>
                      <BuilderButton size="xs" variant="alt1" icon="undo" iconOnly :label="translate('zx_builder_theme_reset_variable')"
                        :disabled="!canEditRemote || !validDraft || !Object.hasOwn(overrides, variable.name)"
                        @click="changeVariable(variable.name, '')" />
                    </div>
                    <BuilderThemeColorInput v-if="isThemeColorVariable(variable.name, variable.value)"
                      :id="'theme-var-' + variable.name" :label="variable.name" :modelValue="overrides[variable.name] ?? ''"
                      :defaultValue="variable.value" :variables="colorVariables" :disabled="!canEditRemote || !validDraft"
                      @change="changeVariable(variable.name, $event)" />
                    <BuilderInput v-else :id="'theme-var-' + variable.name" :modelValue="overrides[variable.name] ?? ''" :placeholder="variable.value || translate('zx_builder_theme_inherited')"
                      :label="variable.name" :disabled="!canEditRemote || !validDraft" :highlightWhenSet="true" class="w-full min-w-0 font-mono text-[12px]"
                      @change="changeVariable(variable.name, $event.target.value)" />
                  </div>
                </div>
                <p v-if="!variables.length" class="p-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_no_variables') }}</p>
              </div>
            </template>
            <div v-else class="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
              <p class="text-[11px] leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_theme_css_hint') }}</p>
              <div class="min-h-[240px] flex-1 overflow-hidden">
                <BuilderCodeEditor class="h-full" fill :modelValue="cssDraft" language="css" :label="translate('zx_builder_theme_css')" :readonly="!canEditRemote" :rows="12"
                  @update:modelValue="drafts[componentId] = $event" />
              </div>
            </div>
          </template>
        </section>
      </div>
    </main>
  </div>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import catalog from '../../../integrations/zaux/generated/component-themes.json';
import { themePreviewConfig } from '../../../integrations/zaux/theme/theme-preview.js';
import { componentThemesCss, parseThemeCss, projectStylesCss, setThemeVariable, themeVariableOverrides, ruleConditions, workspaceThemeCss } from '../../../domain/component-themes.js';
import { isThemeColorVariable } from '../../../domain/theme-colors.js';
import { downloadText } from '../../services/files.js';
import { readLayoutPreferences, saveLayoutPreferences } from '../../services/layout-preferences.js';

// Per-browser panel sizes (editor width, preview properties height), stored under `themeEditor`.
const LIMITS = { editor: [360, 900, 480], props: [120, 720, 280] };
const clampSize = (key, value) => {
  const [min, max, fallback] = LIMITS[key];
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

export default defineComponent({
  setup() {
    const builder = useBuilder();
    const t = builder.translate;
    const componentId = ref('ZButton');
    // 'component' edits the selected component theme; 'project' edits project-styles.css.
    const scope = ref('component');
    const search = ref('');
    const variableSearch = ref('');
    const onlyModified = ref(false);
    const theme = ref('primary');
    const size = ref('m');
    const sampleState = ref('');
    const background = ref('#ffffff');
    const editMode = ref('variables');
    const editTabs = [{ id: 'variables', label: 'zx_builder_theme_variables' }, { id: 'css', label: 'zx_builder_theme_css' }];
    const ruleKey = ref('');
    const drafts = ref({});
    const localError = ref('');
    const projectDraft = ref(null);
    const projectError = ref('');
    const sample = ref(null);
    const previewConfig = ref(null);
    const preview = ref(null);
    const editorWidth = ref(LIMITS.editor[2]);
    const propsHeight = ref(LIMITS.props[2]);
    const propsOpen = ref(true);
    const sizeOptions = computed(() => [...new Set([...(previewConfig.value?.sizes ?? []), size.value])]);
    const selected = computed(() => catalog.find(entry => entry.id === componentId.value));
    const filteredCatalog = computed(() => catalog.filter(entry => (entry.id + ' ' + entry.componentClass).toLowerCase().includes(search.value.toLowerCase())));
    const componentOptions = computed(() => catalog.map(entry => ({ value: entry.id, label: entry.id })));
    const entries = computed(() => builder.document.value.componentThemes ?? []);
    const savedCss = computed(() => entries.value.find(entry => entry.component === componentId.value)?.css ?? '');
    const allCss = computed(() => componentThemesCss(entries.value));
    const cssDraft = computed(() => drafts.value[componentId.value] ?? savedCss.value);
    const dirty = computed(() => cssDraft.value !== savedCss.value);
    const validDraft = computed(() => {
      try { parseThemeCss(cssDraft.value); return true; }
      catch { return false; }
    });
    const savedProjectCss = computed(() => builder.document.value.projectStyles ?? '');
    const projectCssDraft = computed(() => projectDraft.value ?? savedProjectCss.value);
    const projectDirty = computed(() => projectCssDraft.value !== savedProjectCss.value);
    const validProjectDraft = computed(() => {
      try { parseThemeCss(projectCssDraft.value); return true; }
      catch { return false; }
    });
    const currentDirty = computed(() => scope.value === 'project' ? projectDirty.value : dirty.value);
    // Incomplete CSS stays editable without breaking the variable controls or preview.
    const editableCss = computed(() => validDraft.value ? cssDraft.value : savedCss.value);
    const previewCss = computed(() => {
      const previewEntries = entries.value.map(entry => entry.component === componentId.value
        ? { ...entry, css: editableCss.value } : entry);
      if (!previewEntries.some(entry => entry.component === componentId.value)) {
        previewEntries.push({ component: componentId.value, css: editableCss.value });
      }
      return workspaceThemeCss({ componentThemes: previewEntries }, validProjectDraft.value ? projectCssDraft.value : savedProjectCss.value);
    });
    const themeOptions = computed(() => {
      const authored = [...editableCss.value.matchAll(/--theme-([\w-]+)/g)].map(match => match[1]);
      const themes = [...new Set([...selected.value.themes, previewConfig.value?.node.props.theme, ...authored].filter(Boolean))];
      return [{ value: '', label: t('zx_builder_theme_base') }, ...themes.map(value => ({ value, label: value }))];
    });
    const stateOptions = computed(() => ['', 'hover', 'focus', 'active', 'disabled'].map(value => ({ value, label: t('zx_builder_theme_state_' + (value || 'normal')) })));
    const backgroundOptions = computed(() => [{ value: '#ffffff', label: t('zx_builder_theme_background_light') }, { value: '#202020', label: t('zx_builder_theme_background_dark') }]);
    const rules = computed(() => {
      const result = selected.value.rules.map(rule => ({ ...rule, variables: { ...rule.variables } }));
      parseThemeCss(editableCss.value).walkRules(rule => {
        const conditions = ruleConditions(rule);
        if (conditions === null) return;
        const key = JSON.stringify([rule.selector, conditions]);
        if (!result.some(item => item.key === key)) result.push({ key, selector: rule.selector, conditions, variables: {} });
      });
      const filtered = result.filter(rule => {
        const themes = [...rule.selector.matchAll(/--theme-([\w-]+)/g)].map(match => match[1]);
        return theme.value ? themes.includes(theme.value) : !themes.length;
      });
      if (theme.value) {
        const selector = '.' + selected.value.componentClass + '--theme-' + theme.value;
        if (!filtered.length) filtered.push({ key: JSON.stringify([selector, []]), selector, conditions: [], variables: {} });
      }
      return filtered;
    });
    const ruleOptions = computed(() => rules.value.map(rule => ({ value: rule.key, label: [...rule.conditions.map(item => '@' + item.name + ' ' + item.params), rule.selector].join(' / ') })));
    const target = computed(() => rules.value.find(rule => rule.key === ruleKey.value) ?? rules.value[0]);
    const overrides = computed(() => target.value ? themeVariableOverrides(editableCss.value, target.value) : {});
    const variableDefaults = computed(() => {
      const defaults = Object.fromEntries((selected.value.variables ?? []).map(name => [name, '']));
      // Root and component defaults are editable for each theme, without copying them into the project.
      for (const rule of selected.value.rules) {
        if (rule.selector === ':root' || rule.selector === '.' + selected.value.componentClass) Object.assign(defaults, rule.variables);
      }
      Object.assign(defaults, target.value?.variables ?? {});
      for (const name of Object.keys(overrides.value)) defaults[name] ??= '';
      return defaults;
    });
    const colorVariables = computed(() => ({ ...variableDefaults.value, ...overrides.value }));
    const variables = computed(() => Object.entries(variableDefaults.value)
      .filter(([name]) => name.toLowerCase().includes(variableSearch.value.toLowerCase()))
      .filter(([name]) => !onlyModified.value || Object.hasOwn(overrides.value, name))
      .map(([name, value]) => ({ name, value })));
    const previewProps = computed(() => ({ ...sample.value?.props, theme: theme.value, size: size.value }));
    const previewNode = computed(() => ({ ...sample.value, props: { ...previewProps.value,
      ...(previewConfig.value?.themeClass ? { class: [sample.value?.props.class, previewConfig.value.themeClass, previewConfig.value.themeClass + '--theme-' + theme.value] } : {}),
      ...(selected.value.id === 'ZButton' ? { disabled: sampleState.value === 'disabled', class: [sample.value?.props.class, sampleState.value] } : {}) } }));
    watch(() => builder.document.value.id, () => {
      drafts.value = {}; localError.value = '';
      projectDraft.value = null; projectError.value = '';
    });
    watch(componentId, () => {
      previewConfig.value = themePreviewConfig(selected.value, t);
      sample.value = previewConfig.value?.node ?? null;
      theme.value = sample.value?.props.theme ?? '';
      size.value = sample.value?.props.size ?? 'm';
      sampleState.value = ''; localError.value = ''; variableSearch.value = '';
    }, { immediate: true });
    watch(rules, value => {
      if (!value.some(rule => rule.key === ruleKey.value)) ruleKey.value = value[0]?.key ?? '';
    }, { immediate: true });
    let layoutTimer;
    onMounted(() => {
      const saved = readLayoutPreferences().themeEditor ?? {};
      editorWidth.value = clampSize('editor', saved.editor);
      propsHeight.value = clampSize('props', saved.props);
      propsOpen.value = saved.propsOpen !== false;
      watch([editorWidth, propsHeight, propsOpen], () => {
        clearTimeout(layoutTimer);
        layoutTimer = setTimeout(() => saveLayoutPreferences({
          ...readLayoutPreferences(),
          themeEditor: { editor: editorWidth.value, props: propsHeight.value, propsOpen: propsOpen.value }
        }), 250);
      });
    });
    onBeforeUnmount(() => clearTimeout(layoutTimer));
    function resizeEditor(delta) { editorWidth.value = clampSize('editor', editorWidth.value + delta); }
    function resizeProps(delta) { propsHeight.value = clampSize('props', propsHeight.value + delta); }
    function selectComponent(id) { scope.value = 'component'; componentId.value = id; }
    function isActiveComponent(id) { return scope.value === 'component' && componentId.value === id; }
    function changeVariable(name, value) {
      if (!builder.canEditRemote.value || !validDraft.value || !target.value) return;
      try { drafts.value[componentId.value] = setThemeVariable(cssDraft.value, target.value, name, value.trim() === '' ? undefined : value); localError.value = ''; }
      catch { localError.value = 'zx_builder_theme_invalid_css'; }
    }
    function saveTheme() {
      if (!builder.canEditRemote.value) return;
      try {
        parseThemeCss(cssDraft.value);
        builder.updateComponentTheme(componentId.value, cssDraft.value);
        if (savedCss.value === cssDraft.value) discardDraft();
      } catch { localError.value = 'zx_builder_theme_invalid_css'; }
    }
    function discardDraft() { delete drafts.value[componentId.value]; localError.value = ''; }
    function saveProjectStyles() {
      if (!builder.canEditRemote.value) return;
      try {
        parseThemeCss(projectCssDraft.value);
        builder.updateProjectStyles(projectCssDraft.value);
        // Blank CSS removes the field, so a whitespace-only draft also counts as saved.
        if (savedProjectCss.value === projectCssDraft.value || (!savedProjectCss.value && !projectCssDraft.value.trim())) discardProjectDraft();
      } catch { projectError.value = 'zx_builder_theme_invalid_css'; }
    }
    function discardProjectDraft() { projectDraft.value = null; projectError.value = ''; }
    function applyPreview(props) {
      sample.value = { ...sample.value, props };
      if (typeof props.theme === 'string') theme.value = props.theme;
      if (typeof props.size === 'string') size.value = props.size;
    }
    function hasDraft(id) { return Object.hasOwn(drafts.value, id) && drafts.value[id] !== (entries.value.find(entry => entry.component === id)?.css ?? ''); }
    function isModified(id) { return entries.value.some(entry => entry.component === id && entry.css.trim()); }
    function exportCss(bulk) { downloadText(bulk ? 'component-themes.css' : selected.value.id + '.theme.css', componentThemesCss(entries.value, bulk ? undefined : componentId.value), 'text/css'); }
    function exportProjectCss() { downloadText('project-styles.css', projectStylesCss(savedProjectCss.value), 'text/css'); }
    return { ...builder, componentId, scope, selected, filteredCatalog, componentOptions, search, variableSearch, onlyModified, theme, size, sampleState, background, editMode, editTabs,
      isThemeColorVariable, colorVariables, ruleKey, ruleOptions, target, variables, overrides, themeOptions, stateOptions, backgroundOptions, previewNode, preview,
      sample, previewConfig, previewProps, sizeOptions, applyPreview, drafts, savedCss, cssDraft, dirty, currentDirty, allCss, localError, changeVariable, saveTheme, validDraft, previewCss, hasDraft, discardDraft, isModified, exportCss,
      projectDraft, projectError, savedProjectCss, projectCssDraft, projectDirty, validProjectDraft, saveProjectStyles, discardProjectDraft, exportProjectCss,
      selectComponent, isActiveComponent, editorWidth, propsHeight, propsOpen, resizeEditor, resizeProps };
  }
});
</script>
