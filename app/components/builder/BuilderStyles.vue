<template>
  <aside class="flex min-h-0 w-[360px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white min-[1500px]:w-[390px] max-[900px]:h-[70dvh] max-[900px]:!w-full" :style="{ width: `${width}px` }">
    <header class="flex items-start justify-between gap-1 border-b-slim border-zaux-light-grey p-2">
      <div><span class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_workspace') }}</span><h2 class="mt-1 text-[18px] font-semibold">{{ translate('zx_builder_style_settings') }}</h2></div>
      <BuilderButton icon="close" iconOnly :label="translate('zx_builder_close')" @click="stylesOpen = false" />
    </header>
    <ZOverflowContainer class="h-full min-h-0 flex-1" autoOverflow>
      <div class="p-2">
        <p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_styles_hint') }}</p>
        <div class="flex flex-wrap gap-0.5">
          <BuilderButton icon="upload" :label="translate('zx_builder_import_preset')" @click="fileInput.click()" />
          <BuilderButton icon="download" :label="translate('zx_builder_export_preset')" @click="exportPreset" />
          <BuilderButton icon="download" :label="translate('zx_builder_export_css')" @click="exportCss" />
          <BuilderButton icon="copy" :label="translate('zx_builder_copy_css')" @click="copyCss" />
          <BuilderButton icon="undo" :label="translate('zx_builder_reset_styles')" @click="resetStyles" />
          <input ref="fileInput" class="hidden" type="file" accept=".json,application/json" @change="importPreset" />
        </div>
        <p v-if="status" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey" role="status">{{ translate(status) }}</p>
        <p v-if="localError" class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error" role="alert">{{ translate(localError) }}</p>
        <BuilderInput v-model="search" class="mt-2" type="search" :placeholder="translate('zx_builder_search_tokens')" :label="translate('zx_builder_search_tokens')" />
        <details v-for="group in visibleGroups" :key="group.id" :open="group.id === 'components' || !!search" class="mt-2 border-t-slim border-zaux-light-grey pt-2">
          <summary class="cursor-pointer text-[13px] font-semibold">{{ translate(group.label) }} <span class="text-zaux-dark-grey">({{ group.variables.length }})</span></summary>
          <div v-for="variable in group.variables" :key="variable.name" class="mt-2">
            <div class="mb-0.5 flex items-center justify-between gap-1">
              <label :for="variable.name" class="break-all font-mono text-[10px] text-zaux-dark-grey">{{ variable.name }}</label>
              <BuilderButton v-if="hasOverride(variable.name)" icon="undo" iconOnly :label="translate('zx_builder_reset_value') + ': ' + variable.name" @click="updateStyleVariable(variable.name, undefined)" />
            </div>
            <div class="flex items-center gap-1">
              <input v-if="variable.type === 'color'" type="color" class="!h-[34px] !w-[38px] shrink-0 !cursor-pointer !p-0.5" :value="colorHex(currentValue(variable))" :aria-label="translate('zx_builder_choose_color') + ': ' + variable.name" @input="changeVariable(variable, $event.target.value)" />
              <BuilderInput :id="variable.name" :modelValue="variable.type === 'color' ? colorHex(currentValue(variable)) : currentValue(variable)" class="font-mono !text-[11px]" @change="changeVariable(variable, $event.target.value)" />
            </div>
          </div>
        </details>
        <details class="mt-2 border-t-slim border-zaux-light-grey pt-2">
          <summary class="cursor-pointer text-[13px] font-semibold">{{ translate('zx_builder_ui_settings') }}</summary>
          <label v-for="[path, label] in uiControls" :key="path" class="mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-xxs bg-zaux-light p-1 text-[11px]">
            {{ translate(label) }}<input type="checkbox" class="!w-auto accent-zaux-accent" :checked="getValue(uiSettings, path)" @change="updateStyleUI(path, $event.target.checked)" />
          </label>
          <BuilderButton class="mt-1" :label="translate('zx_builder_export_ui')" @click="exportUI" />
          <BuilderButton :label="translate('zx_builder_import_ui')" @click="uiFileInput.click()" />
          <input ref="uiFileInput" class="hidden" type="file" accept=".json,application/json" @change="importUI" />
        </details>
        <details class="mt-2 border-t-slim border-zaux-light-grey pt-2">
          <summary class="cursor-pointer text-[13px] font-semibold">{{ translate('zx_builder_style_json') }}</summary>
          <p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_style_json_hint') }}</p>
          <BuilderCodeEditor v-model="draft" rows="16" :label="translate('zx_builder_style_json')" />
          <BuilderButton :label="translate('zx_builder_apply')" @click="applyDraft" />
        </details>
      </div>
    </ZOverflowContainer>
  </aside>
</template>
<script>
import { defineComponent, computed, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { tokenGroups, uiControls, colorHex, colorValue } from '../../data/styles/tokens.js';
import { defaultUISettings } from '../../services/styles.js';
import { mergeUISettings, validateStylePreset, presetCss } from '../../../domain/styles.js';
import { getValue, clone } from '../../../domain/nodes.js';
import { parseJson } from '../../../domain/validation.js';
import { downloadText } from '../../services/files.js';
import BuilderButton from './BuilderButton.vue';
import BuilderCodeEditor from './BuilderCodeEditor.vue';
import BuilderInput from './BuilderInput.vue';
export default defineComponent({
  components: { BuilderCodeEditor, BuilderButton, BuilderInput },
  props: { width: { default: 360 } },
  setup() {
    const builder = useBuilder();
    const search = ref(''); const draft = ref(''); const fileInput = ref(null); const uiFileInput = ref(null);
    const localError = ref(''); const status = ref('');
    const preset = computed(() => builder.document.value.styles);
    const uiSettings = computed(() => mergeUISettings(defaultUISettings, preset.value.uiSettings));
    const visibleGroups = computed(() => tokenGroups.map(group => ({ ...group, variables: group.variables.filter(variable => variable.name.toLowerCase().includes(search.value.toLowerCase())) })).filter(group => group.variables.length));
    watch(preset, value => { draft.value = JSON.stringify(value, null, 2); }, { immediate: true, deep: true });
    function override(name) { return preset.value.cssVars.find(group => group.selector === ':root')?.vars.find(variable => variable.name === name); }
    function currentValue(variable) { return override(variable.name)?.value ?? variable.value; }
    function changeVariable(variable, value) { builder.updateStyleVariable(variable.name, variable.type === 'color' ? colorValue(value.trim()) : value, variable.type); }
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
    return { ...builder, search, draft, fileInput, uiFileInput, localError, status, visibleGroups, uiControls, uiSettings, colorHex, currentValue, hasOverride: name => !!override(name), changeVariable, applyDraft, importPreset, importUI, exportPreset, exportUI, exportCss, copyCss, getValue };
  }
});
</script>
