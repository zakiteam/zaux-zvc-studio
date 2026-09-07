<template>
  <div class="zb-value">
    <BuilderInput v-if="type === 'switch'" type="select" :modelValue="String(modelValue)" :label="label" :options="[{ value: 'true', label: translate('zx_builder_yes') }, { value: 'false', label: translate('zx_builder_no') }]" @update:modelValue="$emit('update:modelValue', $event === 'true')" />
    <BuilderInput v-else-if="type === 'select'" type="select" :modelValue="modelValue" :label="label" :options="options" @update:modelValue="$emit('update:modelValue', $event)" />
    <textarea v-else-if="type === 'json' || type === 'textarea'" v-model="draft" :aria-label="label" :rows="type === 'json' ? 5 : 3" :class="{ 'zb-code-input': type === 'json' }" spellcheck="false" @change="apply" />
    <BuilderInput v-else v-model="draft" :type="type === 'number' ? 'number' : 'text'" :label="label" @change="apply" />
    <p v-if="invalid" class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error">{{ translate('zx_builder_invalid_json') }}</p>
  </div>
</template>
<script>
import { defineComponent, ref, watch } from 'vue';
import { parseJson } from '../../../domain/validation.js';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderInput from './BuilderInput.vue';
export default defineComponent({
  components: { BuilderInput },
  props: { modelValue: { default: null }, type: { default: 'text' }, label: String, options: { default: () => [] } }, emits: ['update:modelValue'],
  setup(props, { emit }) {
    const draft = ref(''); const invalid = ref(false);
    watch(() => [props.modelValue, props.type], () => { draft.value = props.type === 'json' ? JSON.stringify(props.modelValue ?? null, null, 2) : props.modelValue ?? ''; invalid.value = false; }, { immediate: true, deep: true });
    function selectValue(event) {
      const option = props.options[event.target.selectedIndex];
      emit('update:modelValue', option && typeof option === 'object' ? option.value : option);
    }
    function apply() {
      try {
        const value = props.type === 'json' ? parseJson(draft.value) : props.type === 'number' ? (draft.value === '' ? null : Number(draft.value)) : draft.value;
        invalid.value = false; emit('update:modelValue', value);
      } catch { invalid.value = true; }
    }
    return { ...useTranslation(), draft, invalid, apply, selectValue };
  }
});
</script>
