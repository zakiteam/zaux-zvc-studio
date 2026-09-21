<template>
  <div class="flex min-h-0 flex-1 max-[900px]:flex-col">
    <aside class="flex w-[440px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white max-[900px]:max-h-[240px] max-[900px]:w-full">
      <div class="p-2 space-y-2 border-b-slim border-zaux-light-grey">
        <h1 class="font-semibold">{{ translate('zx_builder_theme_editor') }}</h1>
        <BuilderInput v-model="search" :label="translate('zx_builder_theme_search')" :placeholder="translate('zx_builder_theme_search')" class="w-full" />
      </div>
      <nav class="flex-1 min-h-0 p-1 overflow-auto" :aria-label="translate('zx_builder_theme_components')">
        <button v-for="entry in filteredCatalog" :key="entry.id" type="button"
          class="mb-0.5 block w-full rounded-xxs px-2 py-1.5 text-left hover:bg-zaux-light"
          :class="entry.id === componentId ? 'bg-zaux-light font-semibold text-zaux-accent' : ''"
          :aria-pressed="entry.id === componentId" @click="componentId = entry.id">
          {{ entry.id }} <span v-if="isModified(entry.id)" :aria-label="translate('zx_builder_theme_modified')">*</span>
          <small class="block text-[10px] text-zaux-dark-grey">{{ entry.componentClass }}</small>
        </button>
        <p v-if="!filteredCatalog.length" class="p-2">{{ translate('zx_builder_theme_no_results') }}</p>
      </nav>
    </aside>
    <main v-if="selected" class="flex flex-col flex-1 min-w-0 min-h-0">
      <div class="flex flex-wrap items-center gap-1 p-2 border-b-slim border-zaux-light-grey bg-zaux-white">
        <strong class="mr-auto">{{ selected.id }}</strong>
        <BuilderButton size="xs" :label="translate('zx_builder_design')" @click="workspaceView = 'design'" />
        <BuilderButton size="xs" :label="translate('zx_builder_theme_export_one')" :disabled="!savedCss.trim()" @click="exportCss(false)" />
        <BuilderButton size="xs" :label="translate('zx_builder_theme_export_all')" :disabled="!allCss.trim()" @click="exportCss(true)" />
      </div>
      <div class="flex min-h-0 flex-1 max-[1100px]:flex-col">
        <section class="flex min-h-0 min-w-0 flex-1 flex-col max-[1100px]:min-h-[480px]">
          <div class="grid grid-cols-2 gap-1 p-2 bg-zaux-white">
            <label class="flex flex-col gap-1">
              <span class="text-cta-s">{{ translate('zx_builder_theme_variant') }}</span>
              <BuilderInput v-model="theme" type="select" :options="themeOptions" :label="translate('zx_builder_theme_variant')" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-cta-s">{{ translate('zx_builder_theme_size') }}</span>
              <BuilderInput v-model="size" type="select" :options="sizeOptions" :label="translate('zx_builder_theme_size')" />
            </label>
            <BuilderInput v-if="selected.id === 'ZButton'" v-model="sampleState" type="select" :options="stateOptions" :label="translate('zx_builder_theme_state')" />
            <BuilderInput v-model="background" type="select" :options="backgroundOptions" :label="translate('zx_builder_theme_background')" />
          </div>
          <p class="px-2 py-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_preview_hint') }}</p>
          <template v-if="sample">
            <BuilderThemePreview :node="previewNode" :background="background" />
            <BuilderThemeProps :key="componentId" :modelValue="previewProps" :fields="previewConfig.fields" @apply="applyPreview" />
          </template>
          <p v-else role="status" class="p-2">{{ translate('zx_builder_theme_preview_missing') }}</p>
        </section>
        <section class="flex min-h-0 w-[600px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white max-[1100px]:w-full max-[1100px]:min-h-[440px]">
          <div class="flex gap-1 p-2 border-b-slim border-zaux-light-grey">
            <BuilderButton size="xs" :label="translate('zx_builder_theme_variables')" :aria-pressed="editMode === 'variables'" @click="editMode = 'variables'" />
            <BuilderButton size="xs" :label="translate('zx_builder_theme_css')" :aria-pressed="editMode === 'css'" @click="editMode = 'css'" />
          </div>
          <div class="flex-1 min-h-0 p-2 space-y-2 overflow-auto">
            <p v-if="!canEditRemote" class="text-[11px]">{{ translate('zx_builder_project_readonly') }}</p>
            <p v-if="localError" role="alert" class="text-utility-error">{{ translate(localError) }}</p>
            <template v-if="editMode === 'variables'">
              <label class="block text-[11px]">{{ translate('zx_builder_theme_selector') }}</label>
              <BuilderInput v-model="ruleKey" type="select" :options="ruleOptions" :label="translate('zx_builder_theme_selector')" class="w-full font-mono text-[11px]" />
              <p class="break-all font-mono text-[10px] text-zaux-dark-grey">{{ target?.selector }}</p>
              <p class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_variable_hint') }}</p>
              <p v-if="dirty" role="status" class="text-[11px] text-utility-warning">{{ translate('zx_builder_theme_pending') }}</p>
              <BuilderInput v-model="variableSearch" :label="translate('zx_builder_theme_filter_vars')" :placeholder="translate('zx_builder_theme_filter_vars')" class="w-full" />
              <div v-for="variable in variables" :key="selected.id + ruleKey + variable.name" class="pb-2 border-b-slim border-zaux-light-grey">
                <label :for="'theme-var-' + variable.name" class="mb-1 block break-all font-mono text-[10px]">{{ variable.name }}</label>
                <div class="flex items-center gap-1">
                  <BuilderThemeColorInput v-if="isThemeColorVariable(variable.name, variable.value)"
                    :id="'theme-var-' + variable.name" :label="variable.name" :modelValue="overrides[variable.name] ?? ''"
                    :defaultValue="variable.value" :variables="colorVariables" :disabled="!canEditRemote || dirty"
                    @change="changeVariable(variable.name, $event)" />
                  <BuilderInput v-else :id="'theme-var-' + variable.name" :modelValue="overrides[variable.name] ?? ''" :placeholder="variable.value || translate('zx_builder_theme_inherited')"
                    :label="variable.name" :disabled="!canEditRemote || dirty" :highlightWhenSet="true" class="min-w-0 flex-1 font-mono text-[12px]"
                    @change="changeVariable(variable.name, $event.target.value)" />
                  <BuilderButton size="xs" icon="undo" iconOnly :label="translate('zx_builder_theme_reset_variable')" :disabled="!canEditRemote || dirty || !Object.hasOwn(overrides, variable.name)"
                    @click="changeVariable(variable.name, '')" />
                </div>
              </div>
            </template>
            <template v-else>
              <p class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_css_hint') }}</p>
              <BuilderCodeEditor :modelValue="cssDraft" language="css" :label="translate('zx_builder_theme_css')" :readonly="!canEditRemote" :rows="18" @update:modelValue="drafts[componentId] = $event" />
              <div class="flex flex-wrap gap-1">
                <BuilderButton size="xs" variant="primary" :label="translate('zx_builder_theme_apply_css')" :disabled="!canEditRemote || !dirty" @click="applyCss" />
                <BuilderButton size="xs" :label="translate('zx_builder_theme_discard')" :disabled="!dirty" @click="discardDraft" />
              </div>
            </template>
            <details>
              <summary class="cursor-pointer text-[11px]">{{ translate('zx_builder_theme_source') }}</summary>
              <p class="break-all py-1 font-mono text-[10px]">{{ selected.source }}</p>
            </details>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import catalog from '../../../integrations/zaux/generated/component-themes.json';
import { themePreviewConfig } from '../../../integrations/zaux/theme/theme-preview.js';
import { componentThemesCss, parseThemeCss, setThemeVariable, themeVariableOverrides, ruleConditions } from '../../../domain/component-themes.js';
import { isThemeColorVariable } from '../../../domain/theme-colors.js';
import BuilderThemeColorInput from './fields/BuilderThemeColorInput.vue';
import { downloadText } from '../../services/files.js';
import BuilderButton from './BuilderButton.vue';
import BuilderInput from './fields/BuilderInput.vue';
import BuilderCodeEditor from './fields/BuilderCodeEditor.vue';
import BuilderThemePreview from './BuilderThemePreview.vue';
import BuilderThemeProps from './BuilderThemeProps.vue';

export default defineComponent({
  components: { BuilderThemeColorInput, BuilderButton, BuilderInput, BuilderCodeEditor, BuilderThemePreview, BuilderThemeProps },
  setup() {
    const builder = useBuilder();
    const t = builder.translate;
    const componentId = ref('ZButton');
    const search = ref('');
    const variableSearch = ref('');
    const theme = ref('primary');
    const size = ref('m');
    const sampleState = ref('');
    const background = ref('#ffffff');
    const editMode = ref('variables');
    const ruleKey = ref('');
    const drafts = ref({});
    const localError = ref('');
    const sample = ref(null);
    const previewConfig = ref(null);
    const sizeOptions = computed(() => [...new Set([...(previewConfig.value?.sizes ?? []), size.value])]);
    const selected = computed(() => catalog.find(entry => entry.id === componentId.value));
    const filteredCatalog = computed(() => catalog.filter(entry => (entry.id + ' ' + entry.componentClass).toLowerCase().includes(search.value.toLowerCase())));
    const entries = computed(() => builder.document.value.componentThemes ?? []);
    const savedCss = computed(() => entries.value.find(entry => entry.component === componentId.value)?.css ?? '');
    const allCss = computed(() => componentThemesCss(entries.value));
    const cssDraft = computed(() => drafts.value[componentId.value] ?? savedCss.value);
    const dirty = computed(() => cssDraft.value !== savedCss.value);
    const themeOptions = computed(() => {
      const authored = [...savedCss.value.matchAll(/--theme-([\w-]+)/g)].map(match => match[1]);
      const themes = [...new Set([...selected.value.themes, previewConfig.value?.node.props.theme, ...authored].filter(Boolean))];
      return [{ value: '', label: t('zx_builder_theme_base') }, ...themes.map(value => ({ value, label: value }))];
    });
    const stateOptions = computed(() => ['', 'hover', 'focus', 'active', 'disabled'].map(value => ({ value, label: t('zx_builder_theme_state_' + (value || 'normal')) })));
    const backgroundOptions = computed(() => [{ value: '#ffffff', label: t('zx_builder_theme_background_light') }, { value: '#202020', label: t('zx_builder_theme_background_dark') }]);
    const rules = computed(() => {
      const result = selected.value.rules.map(rule => ({ ...rule, variables: { ...rule.variables } }));
      parseThemeCss(savedCss.value).walkRules(rule => {
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
    const overrides = computed(() => target.value ? themeVariableOverrides(savedCss.value, target.value) : {});
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
      .map(([name, value]) => ({ name, value })));
    const previewProps = computed(() => ({ ...sample.value?.props, theme: theme.value, size: size.value }));
    const previewNode = computed(() => ({ ...sample.value, props: { ...previewProps.value,
      ...(previewConfig.value?.themeClass ? { class: [sample.value?.props.class, previewConfig.value.themeClass, previewConfig.value.themeClass + '--theme-' + theme.value] } : {}),
      ...(selected.value.id === 'ZButton' ? { disabled: sampleState.value === 'disabled', class: [sample.value?.props.class, sampleState.value] } : {}) } }));
    watch(() => builder.document.value.id, () => {
      drafts.value = {}; localError.value = '';
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
    function changeVariable(name, value) {
      if (!builder.canEditRemote.value || dirty.value || !target.value) return;
      try { builder.updateComponentTheme(componentId.value, setThemeVariable(savedCss.value, target.value, name, value.trim() === '' ? undefined : value)); localError.value = ''; }
      catch { localError.value = 'zx_builder_theme_invalid_css'; }
    }
    function applyCss() {
      if (!builder.canEditRemote.value) return;
      try {
        parseThemeCss(cssDraft.value);
        builder.updateComponentTheme(componentId.value, cssDraft.value);
        if (savedCss.value === cssDraft.value) discardDraft();
      } catch { localError.value = 'zx_builder_theme_invalid_css'; }
    }
    function discardDraft() { delete drafts.value[componentId.value]; localError.value = ''; }
    function applyPreview(props) {
      sample.value = { ...sample.value, props };
      if (typeof props.theme === 'string') theme.value = props.theme;
      if (typeof props.size === 'string') size.value = props.size;
    }
    function isModified(id) { return entries.value.some(entry => entry.component === id && entry.css.trim()); }
    function exportCss(bulk) { downloadText(bulk ? 'component-themes.css' : selected.value.id + '.theme.css', componentThemesCss(entries.value, bulk ? undefined : componentId.value), 'text/css'); }
    return { ...builder, componentId, selected, filteredCatalog, search, variableSearch, theme, size, sampleState, background, editMode,
      isThemeColorVariable, colorVariables, ruleKey, ruleOptions, target, variables, overrides, themeOptions, stateOptions, backgroundOptions, previewNode,
      sample, previewConfig, previewProps, sizeOptions, applyPreview, drafts, savedCss, cssDraft, dirty, allCss, localError, changeVariable, applyCss, discardDraft, isModified, exportCss };
  }
});
</script>
