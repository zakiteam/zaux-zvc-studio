<template>
  <div class="zb-property mb-2.5">
    <div class="zb-field-heading flex items-baseline justify-between gap-1 [&_label]:mb-1 [&_label]:text-[11px] [&_label]:font-medium [&>select]:w-[125px] [&>select]:border-none [&>select]:bg-transparent [&>select]:p-0.5 [&>select]:text-[9px] [&>select]:text-zaux-dark-grey"><label :for="`prop-${property}`">{{ property }}</label><select :id="`prop-${property}`" :aria-label="`${translate('zx_builder_binding')}: ${property}`" :value="isBinding(value) ? value.$bind : ''" @change="setBinding"><option value="">{{ translate('zx_builder_literal') }}</option><option v-for="field in fields" :key="field.key" :value="field.key">↗ {{ field.label }}</option></select></div>
    <div v-if="isBinding(value)" class="zb-binding-pill rounded-xxs border-slim border-zaux-accent/20 bg-zaux-accent/5 p-1.5 font-mono text-[11px] text-zaux-accent">↗ {{ value.$bind }}</div>
    <BuilderValue v-else :modelValue="value" :label="property" :type="valueType" @update:modelValue="$emit('change', $event)" />
  </div>
</template>
<script>
import { defineComponent, computed } from 'vue';
import { isBinding, clone } from '../../../domain/nodes.js';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderValue from './BuilderValue.vue';
export default defineComponent({
  components: { BuilderValue }, props: { property: String, value: { default: null }, fields: Array, descriptor: Object }, emits: ['change'],
  setup(props, { emit }) {
    const valueType = computed(() => typeof props.value === 'boolean' ? 'switch' : typeof props.value === 'number' ? 'number' : props.value && typeof props.value === 'object' ? 'json' : typeof props.descriptor?.default === 'boolean' || props.descriptor?.type === Boolean ? 'switch' : ['excerpt', 'contentHTML', 'innerHTML', 'paragraph', 'textContent'].includes(props.property) ? 'textarea' : 'text');
    function setBinding(event) {
      const key = event.target.value;
      if (key) emit('change', { $bind: key });
      else emit('change', clone(props.fields.find(field => field.key === props.value?.$bind)?.default ?? ''));
    }
    return { ...useTranslation(), isBinding, valueType, setBinding };
  }
});
</script>
