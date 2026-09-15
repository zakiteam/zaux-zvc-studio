<template>
  <div class="flex shrink-0 flex-wrap justify-between items-center gap-x-3 gap-y-1.5 border-b-slim border-zaux-light-grey bg-zaux-white px-1 max-[1200px]:px-1 pb-2">
    <div v-if="!previewOnly" class="flex flex-col items-start gap-1">
      <div class="flex items-center gap-1">
        <BuilderButton size="xs" icon="copy" :label="translate('zx_builder_copy_node')" :disabled="!canCopyNode" @click="copySelectedNode()" />
        <BuilderButton size="xs" :label="translate('zx_builder_paste_node')" :disabled="!canPasteNode" @click="pasteNode()" />
      </div>
      <button v-if="clipboardNodeName" type="button" class="max-w-[220px] truncate text-[11px] text-zaux-accent cursor-grab" :draggable="canEditRemote" :disabled="!canEditRemote" :title="translate('zx_builder_drag_copied_node')" @dragstart="dragClipboard" @click="pasteNode()">
        {{ translate('zx_builder_copied_node') }}: {{ clipboardNodeName }}
      </button>
    </div>
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-1.5">
        <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_body_background') }}</span>
        <BuilderStyleSelect color class="w-[190px] max-w-full"
          :modelValue="document.styles.bodyBackground ?? ''" :options="bodyColors"
          :label="translate('zx_builder_body_background')" :disabled="!canEditRemote"
          @update:modelValue="updateBodyBackground" />
      </div>
      <div class="flex items-center gap-2">
        <BuilderButton size="xs" variant="alt1" swatch="#ffffff" :label="translate('zx_builder_canvas_light')"
          :class="{ '!bg-zaux-white ring-1 ring-zaux-accent/40': !canvasDark }" :aria-pressed="!canvasDark" @click="canvasDark = false" />
        <BuilderButton size="xs" variant="alt1" swatch="#18181b" :label="translate('zx_builder_canvas_dark')"
          :class="{ '!bg-zaux-white ring-1 ring-zaux-accent/40': canvasDark }" :aria-pressed="canvasDark" @click="canvasDark = true" />
      </div>
    </div>
    <div class="flex items-start gap-1">
        <div class="flex flex-col items-end min-w-0 gap-1 py-0">
          <div class="flex items-stretch min-w-0 gap-1">
            <BuilderInput
              type="select"
              v-model="viewportMode"
              :label="translate('zx_builder_viewport_mode')"
              :options="[
                { value: 'simple', label: translate('zx_builder_viewport_simple') },
                { value: 'zaux', label: translate('zx_builder_viewport_zaux') },
              ]"
              class="min-w-0 text-[10px] h-full [&_*]:h-full"
            />
            <BuilderInput
              v-if="viewportMode === 'simple'"
              type="select"
              v-model="simpleViewport"
              :options="simpleViewportOptions"
              :label="translate('zx_builder_viewport')"
              class="min-w-0 border-slim border-zaux-light-grey bg-zaux-light text-[11px]"
            />
            <BuilderInput
              v-else
              type="select"
              v-model="viewport"
              :options="viewportOptions"
              :label="translate('zx_builder_viewport')"
              class="min-w-0 border-slim border-zaux-light-grey bg-zaux-light text-[11px]"
            />
          </div>
          <label class="flex cursor-pointer items-center justify-end gap-1 text-[10px] text-zaux-dark-grey">
            <input v-model="followViewportStyles" type="checkbox" class="w-1.5 h-1.5 accent-zaux-accent" />
            <span>{{ translate('zx_builder_follow_viewport_styles') }}</span>
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-1 ml-auto">
					<BuilderButton
						v-if="previewOnly"
						size="xs"
						:label="
							translate(
								previewHeaderHidden
									? 'zx_builder_show_header'
									: 'zx_builder_hide_header',
							)
						"
						:aria-pressed="previewHeaderHidden"
						@click="previewHeaderHidden = !previewHeaderHidden"
					/>
					<BuilderButton
						size="xs"
						:label="
							translate(
								previewOnly ? 'zx_builder_design' : 'zx_builder_preview',
							)
						"
						:icon="previewOnly ? 'edit' : 'visibility'"
						@click="previewOnly = !previewOnly"
					/>
				</div>
    </div>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderButton from './BuilderButton.vue';
import BuilderInput from './fields/BuilderInput.vue';
import BuilderStyleSelect from './fields/styles/BuilderStyleSelect.vue';
import { tokenGroups } from '../../data/styles/tokens.js';
export default defineComponent({
  components: { BuilderButton, BuilderInput, BuilderStyleSelect },
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
    function dragClipboard(event) {
      if (!builder.canEditRemote.value || !builder.clipboardNodeName.value) { event.preventDefault(); return; }
      event.dataTransfer.setData('application/x-zaux-builder', JSON.stringify({ kind: 'clipboard' }));
      event.dataTransfer.effectAllowed = 'copy';
    }
    return { ...builder, bodyColors, dragClipboard };
  }
});
</script>
