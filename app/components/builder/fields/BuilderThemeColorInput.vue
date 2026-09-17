<template>
  <div class="flex h-[32px] min-w-0 flex-1 items-center rounded-xxs bg-zaux-light ring-1 ring-inset ring-zaux-light-grey focus-within:ring-zaux-accent"
    :class="{ 'ring-zaux-accent/50': modelValue !== '', 'opacity-50': disabled }">
    <span class="flex w-[32px] shrink-0 items-center justify-center" :title="displayValue || translate('zx_builder_theme_inherited')">
      <span class="zb-project-swatch relative block h-[16px] w-[16px] overflow-hidden rounded-full border-slim border-zaux-dark-grey/40"
        :style="swatchVariables" role="img" :aria-label="translate('zx_builder_theme_color_sample') + ': ' + (displayValue || translate('zx_builder_theme_inherited'))">
        <span class="absolute inset-0" style="background: repeating-conic-gradient(#c4c4c4 0% 25%, #fff 0% 50%) 0 / 6px 6px" />
        <!-- Only one layer is a valid color: RGB channels or a complete CSS color. -->
        <span :key="'rgb-' + displayValue" class="absolute inset-0" :style="{ backgroundColor: `rgb(${displayValue})` }" />
        <span :key="'css-' + displayValue" class="absolute inset-0" :style="{ backgroundColor: displayValue }" />
      </span>
    </span>
    <BuilderInput :id="id" v-model="draft" :placeholder="defaultValue || translate('zx_builder_theme_inherited')" :label="label" :disabled="disabled"
      class="h-[32px] w-0 min-w-0 flex-1 !bg-transparent !px-0 !pr-1 font-mono text-[11px] focus:outline-none"
      @change="$emit('change', $event.target.value)" />
    <BuilderDropdown class="shrink-0 border-l-slim border-zaux-light-grey" align="end" btnSize="xs" btnTheme="alt1"
      :label="translate('zx_builder_theme_color_tokens')" :items="items" :filterItems="true" :disabled="disabled"
      :extraTriggerProps="{ class: '!min-h-[32px] !px-1.5 !py-0 !border-none !bg-transparent', 'aria-label': translate('zx_builder_theme_color_choose_token') + ': ' + label }"
      @select="selectToken">
      <template #header>
        <p class="text-[11px] font-semibold">{{ translate('zx_builder_theme_color_choose_token') }}</p>
        <p class="mt-0.5 break-all font-mono text-[10px] text-zaux-dark-grey">{{ label }}</p>
      </template>
    </BuilderDropdown>
  </div>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useTranslation } from '../../../composables/useTranslation.js';
import { tokenGroups } from '../../../data/styles/tokens.js';
import { colorCssValue, themeColorTokenValue } from '../../../../domain/theme-colors.js';
import BuilderInput from './BuilderInput.vue';
import BuilderDropdown from '../BuilderDropdown.vue';

export default defineComponent({
  components: { BuilderInput, BuilderDropdown },
  props: { id: String, label: String, modelValue: { type: String, default: '' }, defaultValue: { type: String, default: '' },
    variables: { type: Object, default: () => ({}) }, disabled: Boolean },
  emits: ['change'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const draft = ref(props.modelValue);
    watch(() => props.modelValue, value => { draft.value = value; });
    const displayValue = computed(() => colorCssValue(draft.value || props.defaultValue));
    const swatchVariables = computed(() => Object.fromEntries(Object.entries({ ...props.variables, [props.label]: displayValue.value })
      .filter(([name, value]) => name.startsWith('--') && value !== '').map(([name, value]) => [name, colorCssValue(value)])));
    const items = computed(() => tokenGroups.filter(group => group.variables.some(variable => variable.type === 'color')).flatMap(group =>
      group.variables.filter(variable => variable.type === 'color').map((variable, index) => ({
        id: variable.name, label: variable.name.replace('--zx-color-', ''),
        heading: index === 0 ? translate(group.label) : undefined,
        swatch: `rgb(var(${variable.name}))`,
        active: displayValue.value === `var(${variable.name})` || displayValue.value === `rgb(var(${variable.name}))`
      }))));
    function selectToken(item) {
      draft.value = themeColorTokenValue(item.id, props.defaultValue, props.modelValue);
      emit('change', draft.value);
    }
    return { translate, draft, displayValue, swatchVariables, items, selectToken };
  }
});
</script>
