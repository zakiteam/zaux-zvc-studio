<template>
  <div
    class="flex items-center min-w-0 rounded-xxs focus-within:ring-1 focus-within:ring-zaux-accent"
    :class="modelValue !== '' ? 'bg-zaux-light-accent/20 outline outline-1 outline-zaux-accent/50' : 'bg-zaux-light'"
  >
    <BuilderDropdown
      v-if="color"
      class="flex-1 min-w-0 [&_.zb-builder-dropdown-content]:py-1"
      btnSize="xs"
      :label="selected.label"
      :swatch="selected.swatch"
      :items="items"
      :disabled="disabled"
      :extraTriggerProps="{ customInnerClasses : 'flex justify-between w-full', customInnerWrapperClasses : 'w-full justify-between', class: '!w-full !min-h-[30px] !border-none !bg-transparent', 'aria-label': label + ': ' + selected.label }"
      @select="$emit('update:modelValue', $event.id)"
    />
    <BuilderInput
      v-else
      type="select"
      class="h-[30px] w-0 min-w-0 flex-1 rounded-xxs !bg-transparent text-[11px]"
      :modelValue="modelValue"
      :label="label"
      :options="options"
      :disabled="disabled"
      @update:modelValue="$emit('update:modelValue', $event)"
    />
    <button
      type="button"
      :disabled="disabled || modelValue === ''"
      :aria-label="translate('zx_builder_style_clear') + ': ' + label"
      :title="translate('zx_builder_style_clear')"
      class="flex h-[30px] w-3 shrink-0 items-center justify-center rounded-xxs text-[16px] text-zaux-dark-grey hover:bg-zaux-light-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent disabled:opacity-30"
      @click="$emit('update:modelValue', '')"
    ><span aria-hidden="true">&times;</span></button>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import BuilderInput from '../BuilderInput.vue';
import BuilderDropdown from '../../BuilderDropdown.vue';

export default defineComponent({
  components: { BuilderInput, BuilderDropdown },
  props: {
    modelValue: { type: String, default: '' },
    label: String,
    options: { type: Array, default: () => [] },
    color: Boolean,
    disabled: Boolean
  },
  emits: ['update:modelValue'],
  setup(props) {
    const { translate } = useTranslation();
    const selected = computed(() => props.options.find(option => option.value === props.modelValue)
      ?? { label: props.modelValue || translate('zx_builder_style_unset') });
    const items = computed(() => props.options.map(option => ({
      id: option.value, label: option.label, swatch: option.swatch,
      active: option.value === props.modelValue
    })));
    return { translate, selected, items };
  }
});
</script>
