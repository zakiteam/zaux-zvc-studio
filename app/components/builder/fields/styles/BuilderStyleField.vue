<template>
  <div class="flex items-end  min-w-0 gap-0.5 relative">
    <div class="flex-1 min-w-0"><slot /></div>
    <button
      type="button"
      :disabled="disabled || !value"
      :aria-pressed="!!value && important"
      :aria-label="translate('zx_builder_style_important') + ': ' + label"
      :title="translate('zx_builder_style_important') + ': ' + label"
      class="zb-builder-important-btn flex relative h-[30px] w-3 shrink-0 items-center justify-center rounded-xxs text-[14px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent disabled:opacity-30"
      :class="value && important ? 'bg-zaux-light-accent/50 text-zaux-accent outline outline-1 outline-zaux-accent' : 'bg-zaux-light text-zaux-dark-grey hover:bg-zaux-light-grey'"
      @click="$emit('update:important', !important)"
    ><span aria-hidden="true">!</span></button>
  </div>
</template>
<script>
import { defineComponent } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';

export default defineComponent({
  props: { value: { default: '' }, important: Boolean, disabled: Boolean, label: String },
  emits: ['update:important'],
  setup() {
    const { translate } = useTranslation();
    return { translate };
  }
});
</script>
