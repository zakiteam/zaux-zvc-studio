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
          <BuilderStyleControl v-for="control in visibleControls(section)" :key="control.id" :control="control" :editor="editor" />
        </div>
      </details>
    </fieldset>
    <p v-if="visibility.advanced" class="text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_style_advanced_hint') }}</p>
  </section>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import { useNodeStyleEditor } from '../../../../composables/useNodeStyleEditor.js';
import { hasStyleScope, removeStyleScope, transferBaseStyles, literalClasses } from '../../../../../domain/node-styles.js';
import { descendingStyles } from '../../../../../integrations/zaux/responsive-styles.js';
import { hasResponsiveStyle, resetResponsiveStyles } from '../../../../../domain/responsive-node-styles.js';
import { styleVisibility, visibleStyleSections } from '../../../../../integrations/zaux/style-visibility.js';
import { nodeStyleSections, styleBreakpoints } from '../../../../../integrations/zaux/controls/node-style-controls.js';
import { imageStyleTarget, imageFitControl, imagePositionControl } from '../../../../../integrations/zaux/controls/image-style-controls.js';

export default defineComponent({
  props: { modelValue: { default: '' }, nodeName: String, nodeId: String, preferredScope: { type: String, default: null }, viewportChosen: Boolean, imgClasses: { default: null }, disabled: Boolean },
  emits: ['update:modelValue', 'update:imgClasses', 'update:viewportStyles', 'viewport-chosen', 'update:scope'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const scope = ref('');
    // Control reading/writing is shared with Quick style; this component adds scopes and image styles.
    const editor = useNodeStyleEditor({
      classes: () => props.modelValue,
      scope,
      disabled: () => props.disabled,
      target: () => props.nodeId,
      onChange: value => emit('update:modelValue', value)
    });
    const { editError, editable, granular, visibleControls } = editor;
    const visibility = computed(() => styleVisibility(scope.value));
    const filteredSections = computed(() => visibleStyleSections(nodeStyleSections, visibility.value));
    watch(scope, value => emit('update:scope', value), { immediate: true });
    // Following the preview only changes the editing scope, never authored classes.
    watch([() => props.nodeId, () => props.preferredScope], ([nodeId, preferredScope], [previousNodeId] = []) => {
      if (preferredScope !== null) scope.value = preferredScope;
      else if (nodeId !== previousNodeId) scope.value = '';
    }, { immediate: true });
    const imageTarget = computed(() => imageStyleTarget(props.nodeName));
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
    return { descendingStyles, editor, editError, visibility, filteredSections, configuredScopes, selectScope, resetScope, granular, imageTarget, translate, scope, scopeOptions, visibleControls, editable };
  }
});
</script>
