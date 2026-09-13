<template>
  <details open class="py-2 border-t-slim border-zaux-light-grey">
    <summary class="cursor-pointer text-[12px] mb-0 font-semibold">{{ translate('zx_builder_style_image') }}</summary>
    <p class="my-2 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_style_image_hint') }}</p>
    <p v-if="!editable" class="mb-2 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_style_dynamic') }}</p>
    <fieldset :disabled="disabled || !editable" class="grid grid-cols-2 gap-2 py-2">
      <div class="min-w-0">
        <span class="mb-1 block text-[10px]">{{ translate('zx_builder_style_object_fit') }}</span>
        <BuilderStyleField
          :value="current(imageFitControl)"
          :important="important(imageFitControl)"
          :label="translate('zx_builder_style_object_fit')"
          :disabled="disabled || !editable"
          @update:important="changeImportant(imageFitControl, $event)"
        >
          <BuilderStyleSelect :modelValue="current(imageFitControl)" :options="fitOptions" :label="translate('zx_builder_style_object_fit')" :disabled="disabled || !editable" @update:modelValue="change(imageFitControl, $event)" />
        </BuilderStyleField>
      </div>
      <div class="min-w-0">
        <BuilderStyleField
          :value="current(imagePositionControl)"
          :important="important(imagePositionControl)"
          :label="translate('zx_builder_style_object_position')"
          :disabled="disabled || !editable"
          @update:important="changeImportant(imagePositionControl, $event)"
        >
          <BuilderStyleChoices :modelValue="current(imagePositionControl)" :options="positionOptions" :columns="3" :label="translate('zx_builder_style_object_position')" :disabled="disabled || !editable" @update:modelValue="change(imagePositionControl, $event)" />
        </BuilderStyleField>
        <BuilderStyleField
          :value="readPositionValue(current(imagePositionControl), imagePositionControl)"
          :important="important(imagePositionControl)"
          :label="translate('zx_builder_style_object_position')"
          :disabled="disabled || !editable"
          @update:important="changeImportant(imagePositionControl, $event)"
        >
          <BuilderInput
            :key="scope + current(imagePositionControl)"
            :modelValue="readPositionValue(current(imagePositionControl), imagePositionControl)"
            highlightWhenSet
            :label="translate('zx_builder_style_object_custom')"
            :placeholder="translate('zx_builder_style_object_placeholder')"
            :disabled="disabled || !editable"
            class="mt-2 w-full min-w-0 text-[11px]"
            @input="$event.target.setCustomValidity('')"
            @change="changePosition"
          />
        </BuilderStyleField>
      </div>
    </fieldset>
  </details>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
import { literalClasses, readStyleClass, readStyleImportant, setStyleImportant, replaceStyleClass, readPositionValue, positionValueClass } from '../../../domain/node-styles.js';
import { imageStyleTarget, imageFitControl, imagePositionControl } from '../../../integrations/zaux/image-style-controls.js';
import BuilderStyleSelect from './BuilderStyleSelect.vue';
import BuilderStyleChoices from './BuilderStyleChoices.vue';
import BuilderInput from './BuilderInput.vue';
import BuilderStyleField from './BuilderStyleField.vue';

export default defineComponent({
  components: { BuilderStyleField, BuilderStyleSelect, BuilderStyleChoices, BuilderInput },
  props: { modelValue: { default: null }, nodeName: String, scope: { default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const target = computed(() => imageStyleTarget(props.nodeName));
    const classes = computed(() => props.modelValue ?? target.value.defaults);
    const editable = computed(() => literalClasses(classes.value) !== null);
    const current = control => readStyleClass(classes.value, control, props.scope).replace(/^!/, '');
    const important = control => readStyleImportant(classes.value, control, props.scope);
    function changeImportant(control, enabled) {
      if (props.disabled || !editable.value) return;
      const result = setStyleImportant(classes.value, control, enabled, props.scope);
      emit('update:modelValue', target.value.array ? literalClasses(result) : result);
    }
    const positionOptions = computed(() => imagePositionControl.options.map(option => ({ ...option, label: translate(option.label) })));
    const fitOptions = computed(() => {
      const value = current(imageFitControl);
      return [
        { value: '', label: translate('zx_builder_style_unset') },
        ...(value && !imageFitControl.options.some(option => option.value === value)
          ? [{ value, label: translate('zx_builder_style_custom') + ': ' + value }] : []),
        ...imageFitControl.options.map(option => ({ ...option, label: translate(option.label) }))
      ];
    });
    function change(control, value) {
      if (props.disabled || !editable.value || current(control) === value) return;
      const result = replaceStyleClass(classes.value, control, value, props.scope);
      emit('update:modelValue', target.value.array ? literalClasses(result) : result);
    }
    function changePosition(event) {
      const value = positionValueClass(imagePositionControl, event.target.value);
      event.target.setCustomValidity(value === null ? translate('zx_builder_style_object_invalid') : '');
      if (value === null) {
        event.target.reportValidity();
        return;
      }
      change(imagePositionControl, value);
    }
    return { important, changeImportant, translate, editable, current, imageFitControl, imagePositionControl, fitOptions, positionOptions, change, changePosition, readPositionValue };
  }
});
</script>
