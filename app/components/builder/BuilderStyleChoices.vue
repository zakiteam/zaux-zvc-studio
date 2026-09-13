<template>
  <legend class="mb-1 text-[10px] font-medium">{{ label }}</legend>
  <fieldset :disabled="disabled" class="min-w-0">
    <div class="flex items-center gap-1">
      <div class="grid min-w-0 flex-1 gap-0.5 rounded-xxs bg-zaux-light p-0.5" :style="{ gridTemplateColumns: `repeat(${columns || options.length}, minmax(0, 1fr))` }">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          :title="option.label"
          :aria-label="option.label"
          :aria-pressed="modelValue === option.value"
          :disabled="disabled"
          class="flex min-h-[30px] min-w-0 items-center justify-center gap-1 rounded-xxs border-slim px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaux-accent disabled:cursor-not-allowed disabled:opacity-50"
          :class="modelValue === option.value ? 'border-zaux-accent bg-zaux-white text-zaux-accent' : 'border-transparent hover:bg-zaux-white'"
          @click="$emit('update:modelValue', option.value)"
        >
          <img :src="option.icon" alt="" draggable="false" width="20" height="20" class="min-w-0 shrink" :class="iconClass" />
          <span v-if="showLabels" class="truncate text-[10px]">{{ option.label }}</span>
        </button>
      </div>
      <button
        type="button"
        :disabled="disabled || !modelValue"
        :title="translate('zx_builder_style_clear')"
        :aria-label="translate('zx_builder_style_clear') + ': ' + label"
        class="flex h-[30px] w-3 shrink-0 items-center justify-center rounded-xxs text-[16px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent disabled:opacity-30"
        @click="$emit('update:modelValue', '')"
      ><span aria-hidden="true">&times;</span></button>
    </div>
    <p v-if="modelValue && !options.some(option => option.value === modelValue)" class="mt-1 break-words text-[10px] text-zaux-dark-grey">{{ currentLabel }}</p>
  </fieldset>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';

export default defineComponent({
  props: {
    modelValue: { default: '' },
    label: String,
    options: { type: Array, default: () => [] },
    disabled: Boolean,
    showLabels: Boolean,
    columns: Number,
    iconClass: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  setup(props) {
    const { translate } = useTranslation();
    const currentLabel = computed(() => {
      if (!props.modelValue) return translate('zx_builder_style_unset');
      return props.options.find(option => option.value === props.modelValue)?.label
        ?? translate('zx_builder_style_custom') + ': ' + props.modelValue;
    });
    return { translate, currentLabel };
  }
});
</script>
