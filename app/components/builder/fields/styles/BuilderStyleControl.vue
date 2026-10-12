<template>
  <!-- One control descriptor from node-style-controls.js, rendered by its kind:
       illustrated → icon choices; otherwise select/color picker, plus a custom value for length/integer controls. -->
  <div class="min-w-0" :class="{ 'col-span-2': control.illustrated }">
    <BuilderStyleField
      v-if="control.illustrated"
      :value="editor.current(control)"
      :important="editor.important(control)"
      :label="editor.controlLabel(control)"
      :disabled="editor.controlDisabled(control)"
      @update:important="editor.changeImportant(control, $event)"
      class="[&_.zb-builder-important-btn]:-top-0.5"
    >
      <BuilderStyleChoices
        :modelValue="editor.current(control)"
        :label="editor.controlLabel(control)"
        :options="editor.illustratedOptions(control)"
        :disabled="editor.controlDisabled(control)"
        :showLabels="control.id === 'display'"
        :iconClass="editor.alignmentIconClass(control.id)"
        @update:modelValue="editor.change(control, $event)"
      />
    </BuilderStyleField>
    <template v-else>
      <span class="mb-0.5 block text-[10px]">{{ editor.controlLabel(control) }}</span>
      <BuilderStyleField
        :value="editor.current(control)"
        :important="editor.important(control)"
        :label="editor.controlLabel(control)"
        :disabled="editor.controlDisabled(control)"
        @update:important="editor.changeImportant(control, $event)"
      >
        <BuilderStyleSelect
          :key="scope"
          :color="control.color"
          :modelValue="editor.current(control)"
          :options="editor.controlOptions(control)"
          :label="editor.controlLabel(control)"
          :disabled="editor.controlDisabled(control)"
          class="w-full min-w-0 text-[11px]"
          @update:modelValue="editor.change(control, $event)"
        />
      </BuilderStyleField>
      <BuilderStyleField
        v-if="control.length || control.integer"
        :value="editor.readPositionValue(editor.current(control), control)"
        :important="editor.important(control)"
        :label="editor.controlLabel(control)"
        :disabled="editor.controlDisabled(control)"
        @update:important="editor.changeImportant(control, $event)"
      >
        <BuilderInput
          :key="scope + editor.current(control)"
          :modelValue="editor.readPositionValue(editor.current(control), control)"
          highlightWhenSet
          :label="editor.controlLabel(control) + ': ' + translate('zx_builder_style_custom')"
          :placeholder="translate(control.placeholder ?? (control.nonNegative ? 'zx_builder_style_dimension_placeholder' : control.integer ? 'zx_builder_style_integer_placeholder' : control.depth ? 'zx_builder_style_depth_placeholder' : 'zx_builder_style_length_placeholder'))"
          :disabled="editor.controlDisabled(control)"
          class="mt-1 w-full min-w-0 text-[11px]"
          @input="$event.target.setCustomValidity('')"
          @change="editor.changePositionValue(control, $event)"
        />
      </BuilderStyleField>
    </template>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';

// To give a descriptor a new UI, add a branch keyed by a descriptor flag here:
// every surface using BuilderStyleControl picks it up.
export default defineComponent({
  props: {
    control: { type: Object, required: true },
    // API returned by useNodeStyleEditor.
    editor: { type: Object, required: true }
  },
  setup(props) {
    const { translate } = useTranslation();
    const scope = computed(() => props.editor.scope.value);
    return { translate, scope };
  }
});
</script>
