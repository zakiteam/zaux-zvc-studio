<template>
  <fieldset :disabled="disabled" class="min-w-0">
    <legend class="mb-1 text-[11px] font-medium">{{ label }}</legend>
    <div class="flex flex-wrap gap-0.5">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :title="option.label"
        :aria-label="option.label"
        :aria-pressed="modelValue === option.value"
        :disabled="disabled"
        class="flex min-h-[40px] min-w-[40px] flex-col items-center justify-center gap-0.5 rounded-xxs border-slim p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaux-accent disabled:cursor-not-allowed disabled:opacity-50"
        :class="[
          modelValue === option.value ? 'border-zaux-accent bg-zaux-accent/10' : 'border-zaux-light-grey bg-zaux-white hover:bg-zaux-light',
          showLabels && 'flex-1'
        ]"
        @click="$emit('update:modelValue', option.value)"
      >
        <img :src="option.icon" alt="" draggable="false" width="28" height="28" :class="iconClass" />
        <span v-if="showLabels" class="text-[10px]">{{ option.label }}</span>
      </button>
    </div>
    <div class="mt-1 flex items-start justify-between gap-1 text-[10px] text-zaux-dark-grey">
      <span>{{ currentLabel }}</span>
      <button v-if="modelValue" type="button" :disabled="disabled" class="underline shrink-0 disabled:opacity-50" @click="$emit('update:modelValue', '')">
        {{ translate('zx_builder_reset_value') }}
      </button>
    </div>
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
