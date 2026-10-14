<template>
  <!-- compact: a lone select for the Quick style toolbar; otherwise a one-line label and select
       with the set-state chips below (the Inspector keeps it sticky). -->
  <div
    v-if="compact"
    class="flex min-w-0 items-center rounded-xxs focus-within:ring-1 focus-within:ring-zaux-accent"
    :class="modelValue ? 'bg-zaux-light-accent/20 outline outline-1 outline-zaux-accent/50' : 'bg-zaux-light'"
    :title="translate('zx_builder_style_state') + ': ' + selectedLabel"
  >
    <label class="text-body-xs border-r-slim border-l-set1-light-grey  pl-1 h-full pr-1 flex flex-col justify-center">
      {{ translate('zx_builder_style_state') }}
    </label>
    <BuilderInput type="select" class=" w-[112px] min-w-0 rounded-xxs !bg-transparent text-[10px]"
      :modelValue="modelValue" :label="translate('zx_builder_style_state')" :options="options"
      @update:modelValue="$emit('update:modelValue', $event)" />
  </div>
  <div v-else>
    <label class="flex min-w-0 items-center gap-1.5">
      <span class="shrink-0 text-[11px] font-medium">{{ translate('zx_builder_style_state') }}</span>
      <BuilderInput type="select" class="min-w-0 flex-1" :modelValue="modelValue" :label="translate('zx_builder_style_state')" :options="options"
        @update:modelValue="$emit('update:modelValue', $event)" />
    </label>
    <div v-if="configured.length" class="mt-1 flex flex-wrap gap-1">
      <span v-for="state in configured" :key="state.value" class="inline-flex items-center rounded-xxs border-slim" :class="modelValue === state.value ? 'border-zaux-accent bg-zaux-accent/15' : 'border-zaux-light-grey'">
        <button type="button" class="px-1.5 py-0 text-[10px] font-semibold" :aria-pressed="modelValue === state.value" @click="$emit('update:modelValue', state.value)">{{ translate(state.label) }}</button>
        <button type="button" class="px-1 py-0.5 text-[12px] disabled:opacity-40" :disabled="disabled" :aria-label="translate('zx_builder_style_reset_state') + ': ' + translate(state.label)" :title="translate('zx_builder_style_reset_state') + ': ' + translate(state.label)" @click="$emit('reset', state.value)">
          &times;
        </button>
      </span>
    </div>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import { hasStyleState } from '../../../../../domain/node-styles.js';
import { styleStates } from '../../../../../integrations/zaux/style-states.js';

// Interaction state edited by the style controls ('' is the normal state). States come from
// integrations/zaux/style-states.js; `values` are the class lists checked for authored states.
export default defineComponent({
  props: {
    modelValue: { type: String, default: '' },
    values: { type: Array, default: () => [] },
    disabled: Boolean,
    compact: Boolean
  },
  emits: ['update:modelValue', 'reset'],
  setup(props) {
    const { translate } = useTranslation();
    const configured = computed(() => styleStates.filter(state => props.values.some(value => hasStyleState(value, state.value))));
    // A state authored by hand but missing from the registry stays selectable while it is edited.
    const options = computed(() => [
      { value: '', label: translate('zx_builder_style_state_normal') },
      ...styleStates.map(state => ({
        value: state.value,
        label: translate(state.label) + (props.compact && configured.value.includes(state) ? ' •' : '')
      })),
      ...(props.modelValue && !styleStates.some(state => state.value === props.modelValue) ? [{ value: props.modelValue, label: props.modelValue }] : [])
    ]);
    const selectedLabel = computed(() => options.value.find(option => option.value === props.modelValue)?.label ?? props.modelValue);
    return { translate, configured, options, selectedLabel };
  }
});
</script>
