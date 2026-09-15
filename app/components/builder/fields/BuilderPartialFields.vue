<template>
  <fieldset class="grid gap-2" :disabled="!canEdit">
    <template v-if="reference">
      <div class="flex items-center gap-1">
        <BuilderButton size="xs" class="min-w-0 flex-1" :label="translate('zx_builder_restore_library')"
          :disabled="!canEdit || !original" @click="builder.restorePartialReference(reference)" />
        <BuilderButton size="xs" icon="edit" iconOnly variant="alt1"
          :label="translate('zx_builder_edit_library')" :disabled="!original"
          @click="original && builder.selectLibrary(original.id)" />
      </div>
      <p class="text-[10px] text-zaux-dark-grey">{{ translate(original ? 'zx_builder_partial_restore_hint' : 'zx_builder_partial_original_missing') }}</p>
    </template>
    <p v-if="!definition.fields.length" class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_no_fields') }}</p>
    <div v-for="field in visibleFields" :key="field.key">
      <label class="block mb-1 text-[11px]">{{ field.label }}</label>
      <select v-if="bindings.length" class="mb-1 w-full text-[11px]" :aria-label="translate('zx_builder_binding') + ': ' + field.label"
        :value="isBinding(getValue(modelValue, field.key)) ? getValue(modelValue, field.key).$bind : ''" @change="setBinding(field, $event.target.value)">
        <option value="">{{ translate('zx_builder_literal') }}</option>
        <option v-for="binding in bindings" :key="binding.key" :value="binding.key">{{ binding.label }}</option>
      </select>
      <p v-if="isBinding(getValue(values, field.key))" class="text-[11px]">{{ getValue(values, field.key).$bind }}</p>
      <BuilderValue v-else :disabled="!canEdit" :label="field.label" :type="fieldInputType(field)" :options="optionsFor(field)"
        :image="isImageField(field.key, getValue(values, field.key))" :modelValue="getValue(values, field.key)"
        @update:modelValue="$emit('change', { ...modelValue, [field.key]: $event })" />
    </div>
  </fieldset>
</template>
<script>
import { defineComponent, computed } from 'vue';
import { dataFor, getValue, isBinding, resolveValue } from '../../../../domain/nodes.js';
import { fieldInputType, isFieldVisible } from '../../../../domain/fields.js';
import { isImageField } from '../../../../domain/media.js';
import { useBuilder } from '../../../composables/useBuilder.js';
import { useTranslation } from '../../../composables/useTranslation.js';
import BuilderButton from "../BuilderButton.vue";
import { sourceAvailable } from "../../../services/source-zvc.js";
import BuilderValue from './BuilderValue.vue';
export default defineComponent({
  components: { BuilderValue, BuilderButton },
  props: { reference: Object, bindings: { type: Array, default: () => [] }, definition: Object, modelValue: { type: Object, default: () => ({}) } },
  emits: ['change'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const builder = useBuilder();
    const original = computed(() => builder.partialLibraryDefinition(props.definition));
    const canEdit = computed(() => builder.canEditRemote.value && !builder.isSource.value && (!props.definition.sourceKey || sourceAvailable(props.definition)));
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
    return { translate, builder, original, canEdit, isBinding, setBinding, optionsFor, values, visibleFields, getValue, fieldInputType, isImageField };
  }
});
</script>
