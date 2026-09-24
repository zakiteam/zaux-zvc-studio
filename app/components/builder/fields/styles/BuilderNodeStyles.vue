<template>
  <section class="py-2 my-2 border-y-slim border-zaux-light-grey">
    <h3 class="text-[12px] font-semibold">{{ translate('zx_builder_style_title') }}</h3>
    <label data-style-section="breakpoint" tabindex="-1" class="block mb-2">
      <span class="mb-1 block text-[11px]">{{ translate(descendingStyles ? 'zx_builder_style_descending_scope' : 'zx_builder_style_breakpoint') }}</span>
      <BuilderInput type="select" :modelValue="scope" @update:modelValue="selectScope" :label="translate(descendingStyles ? 'zx_builder_style_descending_scope' : 'zx_builder_style_breakpoint')" :options="scopeOptions" class="w-full" />
    </label>
    <div v-if="configuredScopes.length" class="flex flex-wrap gap-1 mb-2">
      <span v-for="viewport in configuredScopes" :key="viewport.value" class="inline-flex items-center rounded-xxs border-slim" :class="scope === viewport.value ? 'border-zaux-accent bg-zaux-accent/15' : 'border-zaux-light-grey'">
        <button type="button" class="px-1.5 py-0 text-[10px] font-semibold" :aria-pressed="scope === viewport.value" @click="selectScope(viewport.value)">{{ viewport.label }}</button>
        <button type="button" class="px-1 py-0.5 text-[12px] disabled:opacity-40" :disabled="disabled" :aria-label="translate('zx_builder_style_reset_viewport') + ': ' + viewport.label" :title="translate('zx_builder_style_reset_viewport') + ': ' + viewport.label" @click="resetScope(viewport.value)">
          &times;
        </button>
      </span>
    </div>
    <p class="mb-2 text-[10px] text-zaux-dark-grey">{{ translate(descendingStyles && visibility.hint === 'zx_builder_style_hint' ? 'zx_builder_style_descending_hint' : visibility.hint) }}</p>
    <p v-if="descendingStyles && scope" class="mb-2 text-[10px] text-zaux-dark-grey">
      {{ translate('zx_builder_style_responsive_base_hint') }}
      <button type="button" class="underline" @click="selectScope('')">{{ translate(descendingStyles ? 'zx_builder_style_descending_base' : 'zx_builder_style_base') }}</button>
    </p>
    <p v-if="editError" role="status" class="mb-2 text-[11px] text-zaux-accent">{{ translate(editError) }}</p>
    <p v-if="!editable" class="mb-2 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_style_dynamic') }}</p>
    <BuilderImageStyles
      v-if="imageTarget && visibility.image"
      data-style-section="image"
      :nodeName="nodeName"
      @edit-error="editError = $event"
      :modelValue="imageTarget.array ? imgClasses : modelValue"
      :scope="scope"
      :disabled="disabled"
      @update:modelValue="$emit(imageTarget.array ? 'update:imgClasses' : 'update:modelValue', $event)"
    />
    <fieldset :disabled="!editable || disabled">
      <details v-for="section in filteredSections" :key="section.id" :data-style-section="section.id" open class="py-2 border-t-slim border-zaux-light-grey">
        <summary class="cursor-pointer text-[12px] mb-0 font-semibold flex justify-between">
          <span>
            {{ translate(`zx_builder_style_${section.id}`) }}
            </span>
            <button
              v-if="section.globalControls"
              type="button"
              class="ml-2 inline-flex items-center gap-1 rounded-xxs bg-zaux-light px-1 py-0.5 align-middle text-[10px]"
              :disabled="disabled || !editable"
              :aria-pressed="!!granular[section.id]"
              :aria-label="translate(granular[section.id] ? 'zx_builder_style_use_global' : 'zx_builder_style_use_granular') + ': ' + translate(`zx_builder_style_${section.id}`)"
              :title="translate(granular[section.id] ? 'zx_builder_style_use_global' : 'zx_builder_style_use_granular')"
              @click.stop.prevent="granular[section.id] = !granular[section.id]"
            >
              <img :src="granular[section.id] ? '/assets/builder/style-granular.svg' : '/assets/builder/style-global.svg'" width="16" height="16" alt="" class="dark:invert" />
              {{ translate(granular[section.id] ? 'zx_builder_style_granular' : 'zx_builder_style_global') }}
            </button>
        </summary>
        <div class="grid grid-cols-2 py-2 gap-x-2 gap-y-3">
          <div v-for="control in visibleControls(section)" :key="control.id" class="min-w-0" :class="{ 'col-span-2': control.illustrated }">
            <BuilderStyleField
              v-if="control.illustrated"
              :value="current(control)"
              :important="important(control)"
              :label="controlLabel(control)"
              :disabled="controlDisabled(control)"
              @update:important="changeImportant(control, $event)"
              class="[&_.zb-builder-important-btn]:-top-0.5"
            >
              <BuilderStyleChoices
                :modelValue="current(control)"
                :label="controlLabel(control)"
                :options="illustratedOptions(control)"
                :disabled="controlDisabled(control)"
                :showLabels="control.id === 'display'"
                :iconClass="alignmentIconClass(control.id)"
                @update:modelValue="change(control, $event)"
              />
            </BuilderStyleField>
            <template v-else>
              <span class="mb-0.5 block text-[10px]">{{ controlLabel(control) }}</span>
              <BuilderStyleField
                :value="current(control)"
                :important="important(control)"
                :label="controlLabel(control)"
                :disabled="controlDisabled(control)"
                @update:important="changeImportant(control, $event)"
              >
                <BuilderStyleSelect
                  :key="scope"
                  :color="control.color"
                  :modelValue="current(control)"
                  :options="controlOptions(control)"
                  :label="controlLabel(control)"
                  :disabled="controlDisabled(control)"
                  class="w-full min-w-0 text-[11px]"
                  @update:modelValue="change(control, $event)"
                />
              </BuilderStyleField>
              <BuilderStyleField
                v-if="control.length || control.integer"
                :value="readPositionValue(current(control), control)"
                :important="important(control)"
                :label="controlLabel(control)"
                :disabled="controlDisabled(control)"
                @update:important="changeImportant(control, $event)"
              >
                <BuilderInput
                  :key="scope + current(control)"
                  :modelValue="readPositionValue(current(control), control)"
                  highlightWhenSet
                  :label="controlLabel(control) + ': ' + translate('zx_builder_style_custom')"
                  :placeholder="translate(control.nonNegative ? 'zx_builder_style_dimension_placeholder' : control.integer ? 'zx_builder_style_integer_placeholder' : control.depth ? 'zx_builder_style_depth_placeholder' : 'zx_builder_style_length_placeholder')"
                  :disabled="controlDisabled(control)"
                  class="mt-1 w-full min-w-0 text-[11px]"
                  @input="$event.target.setCustomValidity('')"
                  @change="changePositionValue(control, $event)"
                />
              </BuilderStyleField>
            </template>
          </div>
        </div>
      </details>
    </fieldset>
    <p v-if="visibility.advanced" class="text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_style_advanced_hint') }}</p>
  </section>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import { hasStyleScope, removeStyleScope, transferBaseStyles, literalClasses, readStyleClass, positionValueClass, readPositionValue } from '../../../../../domain/node-styles.js';
import { descendingStyles } from '../../../../../integrations/zaux/responsive-styles.js';
import { readResponsiveStyle, readResponsiveImportant, replaceResponsiveStyle, setResponsiveImportant, needsResponsiveBase, hasResponsiveStyle, resetResponsiveStyles } from '../../../../../domain/responsive-node-styles.js';
import { styleVisibility, visibleStyleSections } from '../../../../../integrations/zaux/style-visibility.js';
import { nodeStyleSections, styleBreakpoints } from '../../../../../integrations/zaux/controls/node-style-controls.js';
import { imageStyleTarget, imageFitControl, imagePositionControl } from '../../../../../integrations/zaux/controls/image-style-controls.js';
import BuilderImageStyles from './BuilderImageStyles.vue';
import BuilderInput from '../BuilderInput.vue';
import BuilderStyleField from './BuilderStyleField.vue';
import BuilderStyleSelect from './BuilderStyleSelect.vue';
import BuilderStyleChoices from './BuilderStyleChoices.vue';

export default defineComponent({
  components: { BuilderStyleField, BuilderImageStyles, BuilderInput, BuilderStyleSelect, BuilderStyleChoices },
  props: { modelValue: { default: '' }, nodeName: String, nodeId: String, preferredScope: { type: String, default: null }, viewportChosen: Boolean, imgClasses: { default: null }, disabled: Boolean },
  emits: ['update:modelValue', 'update:imgClasses', 'update:viewportStyles', 'viewport-chosen', 'update:scope'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const scope = ref('');
    const editError = ref('');
    watch([scope, () => props.nodeId], () => { editError.value = ''; });
    const visibility = computed(() => styleVisibility(scope.value));
    const filteredSections = computed(() => visibleStyleSections(nodeStyleSections, visibility.value));
    watch(scope, value => emit('update:scope', value), { immediate: true });
    // Following the preview only changes the editing scope, never authored classes.
    watch([() => props.nodeId, () => props.preferredScope], ([nodeId, preferredScope], [previousNodeId] = []) => {
      if (preferredScope !== null) scope.value = preferredScope;
      else if (nodeId !== previousNodeId) scope.value = '';
    }, { immediate: true });
    const granular = ref({ border: false, rounding: false, padding: false, margin: false });
    const imageTarget = computed(() => imageStyleTarget(props.nodeName));
    const editable = computed(() => literalClasses(props.modelValue) !== null);
    const scopeOptions = computed(() => [{ value: '', label: translate(descendingStyles ? 'zx_builder_style_descending_base' : 'zx_builder_style_base') }, ...(descendingStyles ? [...styleBreakpoints].reverse() : styleBreakpoints)]);
    const styleControls = computed(() => [
      ...nodeStyleSections.flatMap(section => section.controls),
      ...(imageTarget.value && !imageTarget.value.array ? [imageFitControl, imagePositionControl] : [])
    ]);
    const hasScope = (value, controls, prefix) => descendingStyles ? hasResponsiveStyle(value, controls, prefix) : hasStyleScope(value, prefix);
    const configuredScopes = computed(() => styleBreakpoints.filter(({ value }) =>
      hasScope(props.modelValue, styleControls.value, value) || (imageTarget.value?.array && hasScope(props.imgClasses, [imageFitControl, imagePositionControl], value))
    ));
    function selectScope(next) {
      if (!descendingStyles && next && !props.viewportChosen && !scope.value && !configuredScopes.value.length && !props.disabled) {
        const controls = nodeStyleSections.flatMap(section => section.controls);
        if (imageTarget.value && !imageTarget.value.array) controls.push(imageFitControl, imagePositionControl);
        const patch = { class: transferBaseStyles(props.modelValue, next, controls) };
        if (imageTarget.value?.array && props.imgClasses != null) {
          patch.imgClasses = transferBaseStyles(props.imgClasses, next, [imageFitControl, imagePositionControl]);
        }
        emit('update:viewportStyles', patch);
      }
      if (next) emit('viewport-chosen');
      scope.value = next;
    }
    function resetScope(value) {
      if (props.disabled) return;
      if (descendingStyles) {
        const classes = resetResponsiveStyles(props.modelValue, styleControls.value, value);
        const images = imageTarget.value?.array && props.imgClasses != null
          ? resetResponsiveStyles(props.imgClasses, [imageFitControl, imagePositionControl], value) : null;
        editError.value = classes.error || images?.error || '';
        if (editError.value) return;
        emit('update:viewportStyles', { class: classes.value, ...(images ? { imgClasses: literalClasses(images.value) } : {}) });
        return;
      }
      const patch = { class: removeStyleScope(props.modelValue, value) };
      if (imageTarget.value?.array && props.imgClasses != null) patch.imgClasses = removeStyleScope(props.imgClasses, value);
      emit('update:viewportStyles', patch);
      if (scope.value === value) scope.value = '';
    }
    const current = control => readResponsiveStyle(props.modelValue, control, scope.value).replace(/^!/, '');
    const important = control => readResponsiveImportant(props.modelValue, control, scope.value);
    const controlDisabled = control => props.disabled || !editable.value || needsResponsiveBase(props.modelValue, control, scope.value);
    function applyEdit(result) {
      editError.value = result.error || '';
      if (!result.error && result.value !== props.modelValue) emit('update:modelValue', result.value);
    }
    function changeImportant(control, enabled) {
      if (props.disabled || !editable.value) return;
      applyEdit(setResponsiveImportant(props.modelValue, control, enabled, scope.value));
    }
    function inheritedLayoutClass(id) {
      const layout = nodeStyleSections.find(section => section.id === 'layout');
      const control = layout.controls.find(item => item.id === id);
      if (descendingStyles) return readResponsiveStyle(props.modelValue, control, scope.value).replace(/^!/, '');
      const breakpointIndex = styleBreakpoints.findIndex(item => item.value === scope.value);
      const scopes = ['', ...styleBreakpoints.slice(0, breakpointIndex + 1).map(item => item.value)];
      let value = '';
      for (const prefix of scopes) {
        const candidate = readStyleClass(props.modelValue, control, prefix);
        if (candidate && (!value.startsWith('!') || candidate.startsWith('!'))) value = candidate;
      }
      return value.replace(/^!/, '');
    }
    function visibleControls(section) {
      if (section.globalControls) return granular.value[section.id] ? section.controls : section.globalControls;
      if (section.id !== 'layout') return section.controls;
      // Seed flex/grid baselines even when only smaller viewports use that layout.
      if (descendingStyles && !scope.value) return section.controls;
      const display = inheritedLayoutClass('display');
      // Show layout-specific controls only for an authored flex/grid layout.

      const flex = ['flex', 'inline-flex'].includes(display);
      const grid = ['grid', 'inline-grid'].includes(display);
      return section.controls.filter(control => {
        if (['direction', 'wrap'].includes(control.id)) return flex;
        if (control.id === 'columns') return grid;
        if (['align', 'justify', 'gap_x', 'gap_y'].includes(control.id)) return flex || grid;
        return true;
      });
    }
    function alignmentAxis(id) {
      if (!['align', 'justify'].includes(id)) return '';
      const display = inheritedLayoutClass('display');
      const flex = !display || ['flex', 'inline-flex'].includes(display);
      const column = flex && inheritedLayoutClass('direction').startsWith('flex-col');
      return (id === 'align' ? !column : column) ? 'vertical' : 'horizontal';
    }
    function controlLabel(control) {
      if (control.sideLabel) return translate(control.label) + ' · ' + translate(control.sideLabel);
      const axis = alignmentAxis(control.id);
      return translate(axis ? `zx_builder_style_${control.id}_${axis}` : control.label);
    }
    function illustratedOptions(control) {
      const axis = alignmentAxis(control.id);
      const direction = inheritedLayoutClass('direction');
      const reversed = control.id === 'justify' && direction.endsWith('-reverse')
        && ['', 'flex', 'inline-flex'].includes(inheritedLayoutClass('display'));
      return control.options.map(option => {
        let label = translate(option.label);
        if (axis && /-(start|end)$/.test(option.value)) {
          const end = option.value.endsWith('-end') !== reversed;
          const side = axis === 'vertical' ? (end ? 'bottom' : 'top') : (end ? 'right' : 'left');
          label = translate(`zx_builder_style_alignment_${side}`);
        }
        return { ...option, label };
      });
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
        { value: '', label: translate(descendingStyles && scope.value ? 'zx_builder_style_responsive_reset' : 'zx_builder_style_unset') },
        ...(value && !control.options.some(option => option.value === value)
          ? [{ value, label: value === '__mixed__' ? translate('zx_builder_style_mixed') : `${translate('zx_builder_style_custom')}: ${value}` }] : []),
        ...control.options.map(option => ({
          ...option,
          label: translate(option.label) + (option.modeLabel ? ' · ' + translate(option.modeLabel) : '')
        }))
      ];
    }
    function changePositionValue(control, event) {
      const value = positionValueClass(control, event.target.value);
      event.target.setCustomValidity(value === null ? translate(control.nonNegative ? 'zx_builder_style_dimension_invalid' : control.integer ? 'zx_builder_style_integer_invalid' : 'zx_builder_style_length_invalid') : '');
      if (value === null) {
        event.target.reportValidity();
        return;
      }
      change(control, value);
    }
    function change(control, value) {
      if (!editable.value || props.disabled) return;
      applyEdit(replaceResponsiveStyle(props.modelValue, control, value, scope.value));
    }
    return { descendingStyles, editError, controlDisabled, visibility, filteredSections, configuredScopes, selectScope, resetScope, important, changeImportant, granular, imageTarget, translate, scope, scopeOptions, visibleControls, controlLabel, illustratedOptions, alignmentIconClass, editable, nodeStyleSections, current, controlOptions, change, changePositionValue, readPositionValue };
  }
});
</script>
