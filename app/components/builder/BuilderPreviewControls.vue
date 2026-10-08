<template>
  <div class="zb-canvas-toolbar flex shrink-0 flex-wrap items-center gap-1 px-2 pb-0.5 pt-1 text-zaux-dark">
    <!-- Editing context, kept on the canvas like Figma's main-component banner. -->
    <div class="flex min-w-0 flex-1 basis-0 items-center max-[1200px]:basis-full">
      <div v-if="mode === 'library'" role="status" :title="translate('zx_builder_library_notice')"
        class="flex min-w-0 items-center gap-1 rounded-xs border-slim border-zaux-light-grey bg-zaux-white py-0.5 pl-1 pr-1 text-[11px] shadow-sm">
        <span aria-hidden="true" class="h-[8px] w-[8px] shrink-0 rounded-full bg-utility-notice" />
        <span class="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zaux-dark-grey">{{ activeDefinition?.kind === 'zvp' ? 'ZVP' : 'ZVC' }}</span>
        <span class="min-w-0 truncate font-semibold">{{ activeDefinition?.name }}</span>
        <BuilderButton size="xs" variant="alt1" icon="back" :extraProps="{ actionIcon: false }"
          :label="translate('zx_builder_back_template')" @click="selectTemplate(activeTemplate.id)" />
      </div>
    </div>

    <!-- Viewport and zoom. -->
    <div class="flex items-center gap-0.5 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-0.25 shadow-sm"
      role="group" :aria-label="translate('zx_builder_viewport')">
      <BuilderInput type="select" v-model="viewportMode" :label="translate('zx_builder_viewport_mode')"
        :options="[
          { value: 'simple', label: translate('zx_builder_viewport_simple') },
          { value: 'zaux', label: translate('zx_builder_viewport_zaux') },
        ]"
        class="!w-auto !border-none !bg-transparent !py-0.5 !text-[11px] text-zaux-dark-grey" />
      <BuilderInput v-if="viewportMode === 'simple'" type="select" v-model="simpleViewport"
        :options="simpleViewportOptions" :label="translate('zx_builder_viewport')"
        class="!w-auto !border-none !py-0.5 !text-[11px] font-semibold" />
      <BuilderInput v-else type="select" v-model="viewport" :options="viewportOptions"
        :label="translate('zx_builder_viewport')" class="!w-auto !border-none !py-0.5 !text-[11px] font-semibold" />
      <span class="mx-0.25 h-[20px] w-px bg-zaux-light-grey" aria-hidden="true" />
      <div class="flex items-center" role="group" :aria-label="translate('zx_builder_zoom')">
        <BuilderButton size="xs" variant="alt1" icon="zoom-out" iconOnly :label="translate('zx_builder_zoom_out') + ' (Ctrl −)'"
          :disabled="canvasScale <= zoomSteps[0]" @click="zoomBy(-1)" />
        <BuilderDropdown :label="zoomLabel" :items="zoomItems" btnTheme="alt1" icon="dropdown-bottom"
          :extraTriggerProps="{ class: '!w-[76px] !text-[11px] tabular-nums' }" @select="setZoom" />
        <BuilderButton size="xs" variant="alt1" icon="zoom-in" iconOnly :label="translate('zx_builder_zoom_in') + ' (Ctrl +)'"
          :disabled="canvasScale >= zoomSteps.at(-1)" @click="zoomBy(1)" />
      </div>
    </div>

    <!-- Canvas appearance and interaction mode. -->
    <div class="flex min-w-0 flex-1 basis-0 justify-end">
      <div class="flex min-w-0 items-center gap-0.5 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-0.25 shadow-sm">
        <BuilderStyleSelect color class="w-[150px] min-w-0 max-[1400px]:w-[110px]"
          :modelValue="document.styles.bodyBackground ?? ''" :options="bodyColors"
          :label="translate('zx_builder_body_background')" :disabled="!canEditRemote"
          :title="translate('zx_builder_body_background')"
          @update:modelValue="updateBodyBackground" />
        <BuilderButton size="xs" variant="alt1" :icon="followViewportStyles ? 'hyperlink' : 'hyperlink-remove'" iconOnly
          :label="translate('zx_builder_follow_viewport_styles')" :aria-pressed="followViewportStyles"
          :extraProps="{ inheritedUIFlags: { HOVER: followViewportStyles } }"
          @click="followViewportStyles = !followViewportStyles" />
        <!-- Filled variant while active, like the Preview/Design toggle. -->
        <BuilderButton size="xs" :variant="cssInspect ? 'primary' : 'alt1'" icon="scan" iconOnly
          :label="translate('zx_builder_css_inspect') + ' (Shift M)'" :aria-pressed="cssInspect"
          @click="cssInspect = !cssInspect" />
        <BuilderButton size="xs" variant="alt1" :icon="canvasDark ? 'light-mode' : 'dark-mode'" iconOnly
          :label="translate(canvasDark ? 'zx_builder_canvas_light' : 'zx_builder_canvas_dark')"
          @click="canvasDark = !canvasDark" />
        <span class="mx-0.25 h-[20px] w-px bg-zaux-light-grey" aria-hidden="true" />
        <BuilderButton v-if="previewOnly" size="xs" variant="" icon="full-screen-enter" iconOnly
          :label="translate(previewHeaderHidden ? 'zx_builder_show_header' : 'zx_builder_hide_header')"
          :aria-pressed="previewHeaderHidden" :extraProps="{ inheritedUIFlags: { HOVER: previewHeaderHidden } }"
          @click="previewHeaderHidden = !previewHeaderHidden" />
        <BuilderButton size="xs" :variant="previewOnly ? 'primary' : 'secondary'"
          :icon="previewOnly ? 'edit' : 'visibility'" :extraProps="{ actionIcon: false }"
          :label="translate(previewOnly ? 'zx_builder_design' : 'zx_builder_preview')"
          :aria-pressed="previewOnly" @click="previewOnly = !previewOnly" />
      </div>
    </div>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderButton from './BuilderButton.vue';
import BuilderDropdown from './BuilderDropdown.vue';
import BuilderInput from './fields/BuilderInput.vue';
import BuilderStyleSelect from './fields/styles/BuilderStyleSelect.vue';
import { tokenGroups } from '../../data/styles/tokens.js';
export default defineComponent({
  components: { BuilderButton, BuilderDropdown, BuilderInput, BuilderStyleSelect },
  setup() {
    const builder = useBuilder();
    const bodyColors = computed(() => {
      const colors = tokenGroups.flatMap(group => group.variables)
        .filter(variable => variable.type === 'color')
        .map(variable => ({
          value: `rgb(var(${variable.name}))`,
          label: variable.name.replace('--zx-color-', ''),
          swatch: `rgb(var(${variable.name}))`
        }));
      const current = builder.document.value.styles.bodyBackground;
      // Retain colors saved before the token selector was introduced.
      if (current && !colors.some(color => color.value === current)) colors.push({ value: current, label: current, swatch: current });
      return colors;
    });
    const zoomLabel = computed(() => Math.round(builder.canvasScale.value * 100) + '%');
    const zoomItems = computed(() => {
      const t = builder.translate;
      const zoom = builder.canvasZoom.value;
      return [
        { id: 'fit', label: t('zx_builder_zoom_fit') + ' (Shift 1)', active: zoom === 'fit' },
        ...[0.5, 0.75, 1, 1.5, 2].map((value, index) => ({
          id: String(value), separator: index === 0,
          label: Math.round(value * 100) + '%' + (value === 1 ? ' (Shift 0)' : ''),
          active: zoom === value
        }))
      ];
    });
    function setZoom(item) {
      builder.canvasZoom.value = item.id === 'fit' ? 'fit' : Number(item.id);
    }
    return { ...builder, bodyColors, zoomLabel, zoomItems, setZoom };
  }
});
</script>
