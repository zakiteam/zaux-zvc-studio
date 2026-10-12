<template>
  <!-- Not in the top layer: BuilderStyleInput's suggestion popup must stay above it. -->
  <Teleport to="body">
    <div ref="panel" role="dialog" :aria-label="translate('zx_builder_quick_style') + ': ' + nodeName" :style="position"
      class="fixed z-[999] flex flex-col gap-1 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-1.5 font-builder text-[12px] text-zaux-dark shadow-deeper"
      @keydown="onKeydown" @focusout="onFocusOut">
      <div class="flex items-center min-w-0 gap-1">
        <p class="m-0 min-w-0 flex-1 truncate text-[11px] font-semibold" @mousedown.prevent>
          {{ translate('zx_builder_quick_style') }} · <span class="font-mono font-normal text-zaux-dark-grey">{{ nodeName }}</span>
        </p>
        <!-- Focusing the button blurs the field first, which applies the draft like leaving it. -->
        <BuilderButton variant="alt1" icon="close" iconOnly :label="translate('zx_builder_close')" @click="closeQuickStyle()" />
      </div>
      <BuilderStyleInput :modelValue="nodeClasses ?? ''" :label="translate('zx_builder_classes')" @update:modelValue="apply" />
      <p class="m-0 text-[10px] text-zaux-dark-grey" @mousedown.prevent>{{ translate('zx_builder_quick_style_keys') }}</p>
    </div>
  </Teleport>
</template>
<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
const EDGE = 8;
// Inline class editor for the node that was selected when Quick style opened (builder.quickStyle).
// Enter, the close button or leaving the panel apply the classes; Escape discards the draft.
export default defineComponent({
  setup() {
    const builder = useBuilder();
    const panel = ref(null);
    const position = ref({ visibility: 'hidden' });
    const target = builder.quickStyle.value;
    let cancelled = false;
    const nodeName = computed(() => builder.selectedNode.value?.name ?? '');
    const selected = () => (builder.mode.value === 'library' ? 'library' : builder.instanceId.value) === target.instanceId
      && builder.nodeId.value === target.nodeId;
    // Any change that moves editing elsewhere closes the panel instead of retargeting it.
    const stale = computed(() => !selected() || !builder.canStyleNode.value || builder.nodeClasses.value === null
      || !!builder.modal.value || builder.previewOnly.value || builder.workspaceView.value !== 'design');
    watch(stale, value => { if (value) builder.closeQuickStyle(); }, { immediate: true });
    function apply(value) {
      // The field also commits on blur while the panel unmounts: ignore it after Escape or a selection change.
      if (!cancelled && selected()) builder.setNodeClasses(value);
    }
    function onKeydown(event) {
      if (event.isComposing) return;
      // The field handles Escape and Enter first while its suggestions are open, and stops them.
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        cancelled = true;
        builder.closeQuickStyle();
      }
      if (event.key === 'Enter' && event.target.tagName === 'INPUT') builder.closeQuickStyle();
    }
    function onFocusOut(event) {
      if (!panel.value?.contains(event.relatedTarget)) builder.closeQuickStyle();
    }
    // Opens where the context menu was, kept inside the viewport.
    function place() {
      const element = panel.value;
      if (!element) return;
      const width = Math.min(380, window.innerWidth - EDGE * 2);
      element.style.width = `${width}px`;
      const height = element.getBoundingClientRect().height;
      const anchor = target.anchor ?? { left: (window.innerWidth - width) / 2, top: window.innerHeight * 0.3 };
      position.value = {
        width: `${width}px`,
        left: `${Math.max(EDGE, Math.min(anchor.left, window.innerWidth - width - EDGE))}px`,
        top: `${Math.max(EDGE, Math.min(anchor.top, window.innerHeight - height - EDGE))}px`,
      };
    }
    onMounted(async () => {
      window.addEventListener('resize', place);
      place();
      // The panel is hidden until placed and hidden elements cannot take focus: render the position first.
      await nextTick();
      const input = panel.value?.querySelector('input');
      if (!input) return;
      // Ctrl+Alt+S pressed in the canvas iframe: take focus back to the editor document.
      if (document.activeElement?.tagName === 'IFRAME') window.focus();
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
    onBeforeUnmount(() => window.removeEventListener('resize', place));
    return { ...builder, panel, position, nodeName, apply, onKeydown, onFocusOut };
  },
});
</script>
