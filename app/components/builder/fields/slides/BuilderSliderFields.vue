<template>
  <div class="grid gap-2">
    <div v-for="field in fields" :key="field.path">
      <label :for="!field.type || ['number', 'text'].includes(field.type) ? id + field.path : undefined" class="block mb-0.5 text-[11px]">{{ translate(field.label) }}</label>
      <p v-if="boundPath(modelValue, field.path)" class="text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_slider_bound') }}</p>
      <template v-else>
        <BuilderImageInput :id="id + field.path" v-if="isImageField(field.path, pathValue(modelValue, field.path))" :modelValue="pathValue(modelValue, field.path)" :label="translate(field.label)" @update:modelValue="change(field.path, $event)" />
        <BuilderInput v-else-if="field.type === 'number'" :id="id + field.path" type="number" :min="field.min" :step="field.integer ? 1 : 'any'"
          :modelValue="pathValue(modelValue, field.path) ?? ''" :placeholder="String(fallback[field.path] ?? field.default ?? '')"
          :label="translate(field.label)" @change="numberChange(field, $event)" />
        <BuilderInput v-else-if="!field.type || field.type === 'text'" :id="id + field.path"
          :modelValue="pathValue(modelValue, field.path) ?? field.default ?? ''" :label="translate(field.label)"
          @update:modelValue="change(field.path, $event)" />
        <BuilderValue v-else :modelValue="pathValue(modelValue, field.path) ?? field.default ?? ''"
          :type="field.type || 'text'" :label="translate(field.label)" :options="selectOptions(field)"
          @update:modelValue="change(field.path, $event)" />
      </template>
    </div>
  </div>
</template>
<script>
import BuilderImageInput from "../BuilderImageInput.vue";
import { isImageField } from "../../../../../domain/media.js";
import { defineComponent, useId } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import { pathValue, changePath, boundPath } from '../../../../../domain/slider.js';
import BuilderInput from '../BuilderInput.vue';
import BuilderValue from '../BuilderValue.vue';
export default defineComponent({
  components: { BuilderInput, BuilderValue, BuilderImageInput },
  props: { modelValue: { type: Object, required: true }, fields: Array, fallback: { default: () => ({}) } },
  emits: ['change'],
  setup(props, { emit }) {
    const i18n = useTranslation();
    function selectOptions(field) {
      const options = (field.options ?? []).map(option => option.labelKey ? { ...option, label: i18n.translate(option.labelKey) } : option);
      const value = pathValue(props.modelValue, field.path) ?? field.default ?? '';
      if (field.type !== 'select' || options.some(option => Object.is(option.value ?? option, value))) return options;
      return [{ value, label: i18n.translate('zx_builder_custom_value') + (value === '' ? '' : ': ' + value) }, ...options];
    }
    function change(path, value) { emit('change', changePath(props.modelValue, path, value)); }
    function numberChange(field, event) {
      const input = event.target;
      if (input.value === '') { change(field.path, undefined); return; }
      const value = Number(input.value);
      if (!input.validity.valid || !Number.isFinite(value) || (field.integer && !Number.isInteger(value))) return;
      change(field.path, value);
    }
    return { ...i18n, isImageField, selectOptions, id: useId(), pathValue, boundPath, change, numberChange };
  }
});
</script>
