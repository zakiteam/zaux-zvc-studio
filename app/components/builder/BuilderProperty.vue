<template>
  <div class="zb-property mb-2.5">
    <div class="zb-field-heading flex items-baseline justify-between gap-1 [&_label]:mb-1 [&_label]:text-[11px] [&_label]:font-medium [&>select]:w-[125px] [&>select]:border-none [&>select]:bg-transparent [&>select]:p-0.5 [&>select]:text-[9px] [&>select]:text-zaux-dark-grey"><label :for="`prop-${property}`">{{ property }}</label><select :id="`prop-${property}`" :aria-label="`${translate('zx_builder_binding')}: ${property}`" :value="isBinding(value) ? value.$bind : ''" @change="setBinding"><option value="">{{ translate('zx_builder_literal') }}</option><option v-for="field in fields" :key="field.key" :value="field.key">↗ {{ field.label }}</option></select></div>
    <div v-if="isBinding(value)" class="zb-binding-pill rounded-xxs border-slim border-zaux-accent/20 bg-zaux-accent/5 p-1.5 font-mono text-[11px] text-zaux-accent">↗ {{ value.$bind }}</div>
    <template v-else>
      <BuilderInput v-if="options.length" type="select" :modelValue="selectedOption" :label="property" :options="selectOptions" @update:modelValue="selectOption" />
      <BuilderValue v-if="!options.length || selectedOption === -1" :modelValue="value" :label="property" :type="valueType" @update:modelValue="$emit('change', $event)" />
    </template>
  </div>
</template>
<script>
import { defineComponent, computed, ref, watch } from 'vue';
import { isBinding, clone } from '../../../domain/nodes.js';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderValue from './BuilderValue.vue';
import BuilderInput from './BuilderInput.vue';
import { propertyValueType } from '../../../domain/properties.js';
export default defineComponent({
  components: { BuilderValue, BuilderInput }, props: { property: String, value: { default: null }, fields: Array, descriptor: Object }, emits: ['change'],
  setup(props, { emit }) {
    const i18n = useTranslation();
    const custom = ref(false);
    const options = computed(() => props.descriptor?.options ?? []);
    const valueType = computed(() => propertyValueType(props.property, props.value, props.descriptor));
    const selectedOption = computed(() => custom.value ? -1 : options.value.findIndex(option => Object.is(option.value, props.value)));
    // Index values keep the custom entry separate from every possible property value.
    const selectOptions = computed(() => [
      ...options.value.map((option, index) => ({ value: index, label: option.label })),
      { value: -1, label: i18n.translate('zx_builder_custom_value') }
    ]);
    watch(() => props.value, () => { custom.value = false; });
    function selectOption(index) {
      custom.value = index === -1;
      if (index !== -1) emit('change', clone(options.value[index].value));
    }
    function setBinding(event) {
      const key = event.target.value;
      if (key) emit('change', { $bind: key });
      else {
        const value = props.fields.find(field => field.key === props.value?.$bind)?.default;
        emit('change', value === undefined ? '' : clone(value));
      }
    }
    return { ...i18n, isBinding, valueType, options, selectOptions, selectedOption, selectOption, setBinding };
  }
});
</script>
