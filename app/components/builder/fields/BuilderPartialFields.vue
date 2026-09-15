<template>
  <div class="grid gap-2">
    <div v-for="field in visibleFields" :key="field.key">
      <label class="block mb-1 text-[11px]">{{ field.label }}</label>
      <select v-if="bindings.length" class="mb-1 w-full text-[11px]" :aria-label="translate('zx_builder_binding') + ': ' + field.label"
        :value="isBinding(getValue(modelValue, field.key)) ? getValue(modelValue, field.key).$bind : ''" @change="setBinding(field, $event.target.value)">
        <option value="">{{ translate('zx_builder_literal') }}</option>
        <option v-for="binding in bindings" :key="binding.key" :value="binding.key">{{ binding.label }}</option>
      </select>
      <p v-if="isBinding(getValue(values, field.key))" class="text-[11px]">{{ getValue(values, field.key).$bind }}</p>
      <BuilderValue v-else :label="field.label" :type="fieldInputType(field)" :options="optionsFor(field)"
        :image="isImageField(field.key, getValue(values, field.key))" :modelValue="getValue(values, field.key)"
        @update:modelValue="$emit('change', { ...modelValue, [field.key]: $event })" />
    </div>
  </div>
</template>
<script>
import { defineComponent, computed } from 'vue';
import { dataFor, getValue, isBinding, resolveValue } from '../../../../domain/nodes.js';
import { fieldInputType, isFieldVisible } from '../../../../domain/fields.js';
import { isImageField } from '../../../../domain/media.js';
import { useBuilder } from '../../../composables/useBuilder.js';
import { useTranslation } from '../../../composables/useTranslation.js';
import BuilderValue from './BuilderValue.vue';
export default defineComponent({
  components: { BuilderValue },
  props: { bindings: { type: Array, default: () => [] }, definition: Object, modelValue: { type: Object, default: () => ({}) } },
  emits: ['change'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const builder = useBuilder();
    const visibilityData = computed(() => resolveValue(values.value, dataFor(builder.activeDefinition.value, builder.mode.value === 'template' ? builder.activeInstance.value?.data : {})));
    const values = computed(() => dataFor(props.definition, props.modelValue));
    const visibleFields = computed(() => props.definition.fields.filter(field => isFieldVisible(field, visibilityData.value)));
    function setBinding(field, key) {
      emit('change', { ...props.modelValue, [field.key]: key ? { $bind: key } : getValue(dataFor(props.definition), field.key) ?? null });
    }
    function optionsFor(field) {
      const options = field.options ?? [];
      const value = getValue(values.value, field.key);
      if (field.type !== 'select' || options.some(option => Object.is(typeof option === 'object' ? option.value : option, value))) return options;
      return [{ label: translate('zx_builder_custom_value') + ': ' + String(value), value }, ...options];
    }
    return { translate, isBinding, setBinding, optionsFor, values, visibleFields, getValue, fieldInputType, isImageField };
  }
});
</script>
