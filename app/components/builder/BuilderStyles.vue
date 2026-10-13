<template>
  <aside class="flex min-h-0 w-[304px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white max-[900px]:h-[70dvh] max-[900px]:!w-full" :style="{ width: `${width}px` }">
    <header class="flex h-[44px] shrink-0 items-center justify-between gap-1 border-b-slim border-zaux-light-grey px-1.5">
      <div class="min-w-0">
        <h2 class="truncate text-[12px] font-semibold leading-tight">{{ translate('zx_builder_style_settings') }}</h2>
        <p class="truncate text-[9px] font-semibold uppercase leading-tight tracking-[1px] text-zaux-dark-grey">{{ translate('zx_builder_workspace') }}</p>
      </div>
      <BuilderButton icon="close" iconOnly size="xs" variant="alt1" :label="translate('zx_builder_close')" @click="stylesOpen = false" />
    </header>

    <!-- Board (graphical tokens) or the live page canvas. -->
    <div class="shrink-0 border-b-slim border-zaux-light-grey p-1.5">
      <div class="grid grid-cols-2 gap-0.25 rounded-xs bg-zaux-light p-0.25" role="group" :aria-label="translate('zx_builder_tokens_surface')">
        <button v-for="item in surfaces" :key="item.id" type="button" :aria-pressed="tokensView === item.id"
          class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          :class="tokensView === item.id ? 'bg-zaux-white text-zaux-dark shadow-sm' : 'text-zaux-dark-grey hover:text-zaux-dark'"
          @click="tokensView = item.id">{{ translate(item.label) }}</button>
      </div>
    </div>

    <div class="flex h-[40px] shrink-0 items-center gap-0.5 border-b-slim border-zaux-light-grey px-1" role="tablist" :aria-label="translate('zx_builder_style_settings')">
      <button v-for="item in tabs" :key="item.id" type="button" role="tab" :aria-selected="tab === item.id"
        class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
        :class="tab === item.id ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
        @click="tab = item.id">{{ translate(item.label) }}</button>
    </div>

    <div v-if="status || localError" class="shrink-0 space-y-1 border-b-slim border-zaux-light-grey p-1.5">
      <p v-if="status" class="text-[11px] leading-[1.65] text-zaux-dark-grey" role="status">{{ translate(status) }}</p>
      <p v-if="localError" class="zb-field-error rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error" role="alert">{{ translate(localError) }}</p>
    </div>
    <BuilderFontLibrary v-if="fontsOpen" :modelValue="preset.fonts ?? []" :readonly="!canEditRemote" @close="fontsOpen = false" @apply="applyFonts" />

    <ZOverflowContainer :fade="0" ref="list" class="flex-1 h-full min-h-0" autoOverflow>
      <!-- Tokens: every editable variable, grouped, with a small visual sample. -->
      <div v-show="tab === 'tokens'" class="px-1.5 py-1.5">
        <p v-if="designer" class="!mb-1.5 rounded-xxs bg-utility-warning/20 p-1 text-[11px] leading-[1.6] text-zaux-dark" role="note">{{ translate('zx_builder_global_tokens_hint') }}</p>
        <details class="mb-1.5 text-[11px]">
          <summary class="cursor-pointer text-zaux-dark-grey">{{ translate('zx_builder_theme_help') }}</summary>
          <p class="zb-help !mb-0 !mt-1 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_styles_hint') }}</p>
        </details>
        <BuilderInput v-model="search" class="mb-1.5" type="search" :placeholder="translate('zx_builder_search_tokens')" :label="translate('zx_builder_search_tokens')" />
        <details v-for="group in visibleGroups" :key="group.id" :open="openGroups.includes(group.id) || !!search"
          class="border-t-slim border-zaux-light-grey py-1" @toggle="setGroupOpen(group.id, $event.target.open)">
          <summary class="cursor-pointer py-0.5 text-[12px] font-semibold">{{ translate(group.label) }} <span class="font-normal text-zaux-dark-grey">({{ group.variables.length }})</span></summary>
          <BuilderButton v-if="group.id === 'fonts'" size="xs" icon="book-open" class="mt-0.5" :label="translate('zx_builder_fonts_project')" @click="fontsOpen = true" />
          <div v-for="variable in group.variables" :key="variable.name" :data-token="variable.name"
            class="mt-1 rounded-xxs border-slim p-1 transition-colors"
            :class="selectedToken === variable.name ? 'border-zaux-accent bg-zaux-light-accent/20' : 'border-transparent'"
            @focusin="selectedToken = variable.name">
            <div class="mb-0.5 flex items-center gap-1">
              <span v-if="group.id !== 'fonts'" class="h-[24px] w-[24px] shrink-0 overflow-hidden rounded-xxs border-slim border-zaux-light-grey">
                <BuilderTokenSample :group="group.id" :value="currentValue(variable)" />
              </span>
              <label :for="variable.name" class="min-w-0 flex-1 break-all font-mono text-[10px] text-zaux-dark-grey">{{ variable.name }}</label>
              <BuilderButton v-if="hasOverride(variable.name)" iconOnly icon="undo" size="xs" variant="alt1" :label="translate('zx_builder_reset_value') + ': ' + variable.name" @click="updateStyleVariable(variable.name, undefined)" />
            </div>
            <BuilderInput v-if="group.id === 'fonts' && preset.fonts?.length" type="select" modelValue=""
              :label="translate('zx_builder_fonts_family')" :disabled="!canEditRemote" class="w-full mb-1"
              :options="[{ value: '', label: translate('zx_builder_fonts_choose') }, ...preset.fonts.map(font => ({ value: JSON.stringify(font.family) + ', sans-serif', label: font.family }))]"
              @update:modelValue="$event && changeVariable(variable, $event)" />
            <div class="flex items-center gap-1">
              <input v-if="variable.type === 'color'" type="color" class="!h-[34px] !w-[38px] shrink-0 !cursor-pointer !p-0.5" :value="colorHex(currentValue(variable))" :aria-label="translate('zx_builder_choose_color') + ': ' + variable.name" @input="changeVariable(variable, $event.target.value)" />
              <BuilderInput :id="variable.name" :modelValue="variable.type === 'color' ? colorHex(currentValue(variable)) : currentValue(variable)" class="font-mono !text-[11px]" @change="changeVariable(variable, $event.target.value)" />
            </div>
          </div>
        </details>
        <p v-if="!visibleGroups.length" class="py-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_tokens_no_results') }}</p>
      </div>

      <!-- UI settings. -->
      <div v-show="tab === 'ui'" class="px-1.5 py-1.5">
        <div class="mb-1.5 mt-1.5">
          <label class="text-cta-s mb-1.5 text-zaux-dark-grey">{{ translate('zx_builder_ui_icon_set') }}</label>
          <BuilderInput type="select" :modelValue="getValue(uiSettings, 'global.iconSet')" :options="iconSetOptions" :label="translate('zx_builder_ui_icon_set')" :disabled="!canEditRemote" @update:modelValue="value => value && updateStyleUI('global.iconSet', value)" />
        </div>
        <label v-for="[path, label] in uiControls" :key="path" class="mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-xxs bg-zaux-light py-1 pr-1 pl-1.5 text-[11px]">
          {{ translate(label) }}<input type="checkbox" class="!w-auto accent-zaux-accent" :checked="getValue(uiSettings, path)" @change="updateStyleUI(path, $event.target.checked)" />
        </label>
        <div class="flex items-stretch gap-1 pt-1.5">
          <BuilderButton size="xs" icon="download" :label="translate('zx_builder_export_ui')" @click="exportUI" />
          <BuilderButton size="xs" icon="upload" :label="translate('zx_builder_import_ui')" @click="uiFileInput.click()" />
          <input ref="uiFileInput" class="hidden" type="file" accept=".json,application/json" @change="importUI" />
        </div>
      </div>

      <!-- Preset: fonts, import/export, reset and the JSON source. -->
      <div v-show="tab === 'preset'" class="space-y-2 px-1.5 py-1.5">
        <section class="space-y-1">
          <h3 class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_fonts_project') }}</h3>
          <p class="text-[11px] text-zaux-dark-grey">{{ (preset.fonts ?? []).map(font => font.family).join(', ') || '—' }}</p>
          <BuilderButton size="xs" icon="book-open" :label="translate('zx_builder_fonts_project')" @click="fontsOpen = true" />
        </section>
        <section class="space-y-1 border-t-slim border-zaux-light-grey pt-1.5">
          <h3 class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_tokens_tab_preset') }}</h3>
          <div class="flex flex-wrap gap-0.5">
            <BuilderButton size="xs" icon="upload" :label="translate('zx_builder_import_preset')" @click="fileInput.click()" />
            <BuilderButton size="xs" icon="download" :label="translate('zx_builder_export_preset')" @click="exportPreset" />
            <BuilderButton size="xs" icon="download" :label="translate('zx_builder_export_css')" @click="exportCss" />
            <BuilderButton size="xs" icon="copy" :label="translate('zx_builder_copy_css')" @click="copyCss" />
            <BuilderButton size="xs" icon="undo" :label="translate('zx_builder_reset_styles')" @click="resetStyles" />
            <input ref="fileInput" class="hidden" type="file" accept=".json,application/json" @change="importPreset" />
          </div>
        </section>
        <section class="space-y-1 border-t-slim border-zaux-light-grey pt-1.5">
          <h3 class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_style_json') }}</h3>
          <p class="zb-help !my-0 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_style_json_hint') }}</p>
          <BuilderButton size="xs" :label="translate('zx_builder_apply')" @click="applyDraft" />
          <BuilderCodeEditor v-model="draft" rows="16" :label="translate('zx_builder_style_json')" />
        </section>
      </div>
    </ZOverflowContainer>
  </aside>
</template>
<script>
import { defineComponent, computed, nextTick, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { tokenGroups, uiControls, colorHex, colorValue } from '../../data/styles/tokens.js';
import { iconSets } from '@integration/options/icon-options.js';
import { defaultUISettings } from '../../services/styles.js';
import { mergeUISettings, validateStylePreset, presetCss, styleVariableOverride } from '../../../domain/styles.js';
import { getValue, clone } from '../../../domain/nodes.js';
import { parseJson } from '../../../domain/validation.js';
import { downloadText } from '../../services/files.js';
export default defineComponent({
  props: { width: { default: 360 } },
  setup() {
    const builder = useBuilder();
    const fontsOpen = ref(false);
    function applyFonts(fonts) { builder.updateProjectFonts(fonts); fontsOpen.value = false; }
    const search = ref(''); const draft = ref(''); const fileInput = ref(null); const uiFileInput = ref(null); const list = ref(null);
    const localError = ref(''); const status = ref('');
    const tab = ref('tokens');
    const tabs = [{ id: 'tokens', label: 'zx_builder_tokens_tab_tokens' }, { id: 'ui', label: 'zx_builder_ui_settings' }, { id: 'preset', label: 'zx_builder_tokens_tab_preset' }];
    const surfaces = [{ id: 'board', label: 'zx_builder_tokens_view_board' }, { id: 'canvas', label: 'zx_builder_tokens_view_canvas' }];
    const openGroups = ref(['components']);
    const preset = computed(() => builder.document.value.styles);
    const uiSettings = computed(() => mergeUISettings(defaultUISettings, preset.value.uiSettings));
    const iconSetOptions = Object.keys(iconSets).sort().map(name => ({ value: name, label: name }));
    const visibleGroups = computed(() => tokenGroups.map(group => ({ ...group, variables: group.variables.filter(variable => variable.name.toLowerCase().includes(search.value.toLowerCase())) })).filter(group => group.variables.length));
    watch(preset, value => { draft.value = JSON.stringify(value, null, 2); }, { immediate: true, deep: true });
    function override(name) { return styleVariableOverride(preset.value, name); }
    function currentValue(variable) { return override(variable.name)?.value ?? variable.value; }
    function changeVariable(variable, value) { builder.updateStyleVariable(variable.name, variable.type === 'color' ? colorValue(value.trim()) : value, variable.type); }
    function setGroupOpen(id, open) {
      if (open && !openGroups.value.includes(id)) openGroups.value = [...openGroups.value, id];
      if (!open && !search.value) openGroups.value = openGroups.value.filter(item => item !== id);
    }
    // A token picked on the board opens its group and scrolls its editor into view.
    watch(builder.selectedToken, async name => {
      const group = tokenGroups.find(item => item.variables.some(variable => variable.name === name));
      if (!group) return;
      tab.value = 'tokens';
      setGroupOpen(group.id, true);
      await nextTick();
      const root = list.value?.$el ?? list.value;
      root?.querySelector?.(`[data-token="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'nearest' });
    });
    function applyPreset(value) {
      try { builder.replaceStyles(validateStylePreset(value)); localError.value = ''; status.value = 'zx_builder_preset_applied'; }
      catch (error) { localError.value = error.message.startsWith('zx_') ? error.message : 'zx_builder_invalid_style_preset'; }
    }
    function applyDraft() { try { applyPreset(parseJson(draft.value)); } catch { localError.value = 'zx_builder_invalid_json'; } }
    async function readFile(event) {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return null;
      if (file.size > 5_000_000) throw new Error('zx_builder_file_too_large');
      return parseJson(await file.text());
    }
    async function importPreset(event) { try { const value = await readFile(event); if (value) applyPreset(value); } catch (error) { localError.value = error.message.startsWith('zx_') ? error.message : 'zx_builder_invalid_json'; } }
    async function importUI(event) {
      try {
        const value = await readFile(event); if (!value) return;
        if (typeof value !== 'object' || Array.isArray(value) || !value.global) throw new Error('zx_builder_invalid_style_preset');
        const next = clone(preset.value); next.uiSettings = mergeUISettings(defaultUISettings, value); applyPreset(next);
      } catch (error) { localError.value = error.message.startsWith('zx_') ? error.message : 'zx_builder_invalid_json'; }
    }
    function exportPreset() { downloadText('zaux-style-preset.json', JSON.stringify(preset.value, null, 2)); }
    function exportUI() { downloadText('zaux-ui-settings.json', JSON.stringify(uiSettings.value, null, 2)); }
    function exportCss() { downloadText('zaux-tokens.css', presetCss(preset.value)); }
    async function copyCss() { try { await navigator.clipboard.writeText(presetCss(preset.value)); status.value = 'zx_builder_copied'; } catch { localError.value = 'zx_builder_clipboard_error'; } }
    return { ...builder, preset, fontsOpen, applyFonts, search, draft, fileInput, uiFileInput, list, localError, status, tab, tabs, surfaces, openGroups, setGroupOpen, visibleGroups, uiControls, iconSetOptions, uiSettings, colorHex, currentValue, hasOverride: name => !!override(name), changeVariable, applyDraft, importPreset, importUI, exportPreset, exportUI, exportCss, copyCss, getValue };
  }
});
</script>
