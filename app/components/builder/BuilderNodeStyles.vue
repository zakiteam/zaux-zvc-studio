<template>
  <section class="py-2 mb-3 border-y-slim border-zaux-light-grey">
    <h3 class="mb-2 text-[12px] font-semibold">{{ translate('zx_builder_style_title') }}</h3>
    <label class="block mb-2">
      <span class="mb-1 block text-[11px]">{{ translate('zx_builder_style_breakpoint') }}</span>
      <BuilderInput type="select" v-model="scope" :label="translate('zx_builder_style_breakpoint')" :options="scopeOptions" class="w-full" />
    </label>
    <p class="mb-2 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_style_hint') }}</p>
    <p v-if="!editable" class="mb-2 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_style_dynamic') }}</p>
    <fieldset :disabled="!editable || disabled">
      <details v-for="section in nodeStyleSections" :key="section.id" open class="mb-2">
        <summary class="cursor-pointer py-1 text-[11px] font-semibold">{{ translate(`zx_builder_style_${section.id}`) }}</summary>
        <div class="grid grid-cols-2 gap-1.5 py-1">
          <div v-for="control in section.controls" :key="control.id" class="min-w-0" :class="{ 'col-span-2': control.illustrated }">
            <BuilderStyleChoices
              v-if="control.illustrated"
              :modelValue="current(control)"
              :label="translate(control.label)"
              :options="control.options.map(option => ({ ...option, label: translate(option.label) }))"
              :disabled="!editable || disabled"
              :showLabels="control.id === 'display'"
              :iconClass="alignmentIconClass(control.id)"
              @update:modelValue="change(control, $event)"
            />
            <template v-else>
              <span class="mb-0.5 block text-[10px]">{{ translate(control.label) }}</span>
              <BuilderDropdown
                v-if="control.color"
                :key="scope"
                class="!w-full"
                btnSize="xs"
                :label="selectedOption(control).label"
                :swatch="selectedOption(control).swatch"
                :items="colorItems(control)"
                :disabled="!editable || disabled"
                :extraTriggerProps="{ class : 'w-full', title: translate(control.label) + ': ' + selectedOption(control).label }"
                @select="change(control, $event.id)"
              />
              <BuilderInput
                v-else
                type="select"
                :modelValue="current(control)"
                :options="controlOptions(control)"
                :label="translate(control.label)"
                :disabled="!editable || disabled"
                class="w-full min-w-0 text-[11px]"
                @update:modelValue="change(control, $event)"
              />
            </template>
          </div>
        </div>
      </details>
    </fieldset>
    <p class="text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_style_advanced_hint') }}</p>
  </section>
</template>
<script>
import { computed, defineComponent, ref } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
import { literalClasses, readStyleClass, replaceStyleClass } from '../../../domain/node-styles.js';
import { nodeStyleSections, styleBreakpoints } from '../../../integrations/zaux/node-style-controls.js';
import BuilderInput from './BuilderInput.vue';
import BuilderDropdown from './BuilderDropdown.vue';
import BuilderStyleChoices from './BuilderStyleChoices.vue';

export default defineComponent({
  components: { BuilderInput, BuilderDropdown, BuilderStyleChoices },
  props: { modelValue: { default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const scope = ref('');
    const editable = computed(() => literalClasses(props.modelValue) !== null);
    const scopeOptions = computed(() => [{ value: '', label: translate('zx_builder_style_base') }, ...styleBreakpoints]);
    const current = control => readStyleClass(props.modelValue, control, scope.value);
    function inheritedLayoutClass(id) {
      const layout = nodeStyleSections.find(section => section.id === 'layout');
      const control = layout.controls.find(item => item.id === id);
      const breakpointIndex = styleBreakpoints.findIndex(item => item.value === scope.value);
      const scopes = ['', ...styleBreakpoints.slice(0, breakpointIndex + 1).map(item => item.value)];
      let value = '';
      for (const prefix of scopes) {
        const candidate = readStyleClass(props.modelValue, control, prefix);
        if (candidate && (!value.startsWith('!') || candidate.startsWith('!'))) value = candidate;
      }
      return value.replace(/^!/, '');
    }
    function alignmentIconClass(id) {
      const display = inheritedLayoutClass('display');
      if (display && !['flex', 'inline-flex'].includes(display)) return '';
      const direction = inheritedLayoutClass('direction');
      if (id === 'align') return direction.startsWith('flex-col') ? '-rotate-90' : '';
      if (id !== 'justify') return '';
      return {
        'flex-row-reverse': '-scale-x-100',
        'flex-col': 'rotate-90',
        'flex-col-reverse': '-rotate-90'
      }[direction] ?? '';
    }
    function controlOptions(control) {
      const value = current(control);
      return [
        { value: '', label: translate('zx_builder_style_unset') },
        ...(value && !control.options.some(option => option.value === value)
          ? [{ value, label: `${translate('zx_builder_style_custom')}: ${value}` }] : []),
        ...control.options.map(option => ({ ...option, label: translate(option.label) }))
      ];
    }
    function selectedOption(control) {
      return controlOptions(control).find(option => option.value === current(control));
    }
    function colorItems(control) {
      return controlOptions(control).map(option => ({
        id: option.value,
        label: option.label,
        swatch: option.swatch,
        active: option.value === current(control),
        disabled: option.value !== '' && !control.options.some(item => item.value === option.value)
      }));
    }
    function change(control, value) {
      if (!editable.value || props.disabled || current(control) === value) return;
      emit('update:modelValue', replaceStyleClass(props.modelValue, control, value, scope.value));
    }
    return { translate, scope, scopeOptions, alignmentIconClass, editable, nodeStyleSections, current, controlOptions, selectedOption, colorItems, change };
  }
});
</script>