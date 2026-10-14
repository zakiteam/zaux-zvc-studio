<template>
  <!-- Not in the top layer: BuilderStyleInput's suggestion popup must stay above it. -->
  <Teleport to="body">
    <!-- tabindex: a click on a non-focusable spot keeps focus inside the panel. -->
    <div ref="panel" role="dialog" tabindex="-1" :aria-label="translate('zx_builder_quick_style') + ': ' + nodeName" :style="position"
      class="fixed z-[999] outline-none flex flex-col gap-1 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-1.5 font-builder text-[12px] text-zaux-dark shadow-deeper"
      @keydown="onKeydown" @focusout="onFocusOut">
      <div class="flex items-center min-w-0 gap-1">
        <p class="m-0 min-w-0 flex-1 truncate text-[11px] font-semibold" @mousedown.prevent>
          {{ translate('zx_builder_quick_style') }} · <span class="font-mono font-normal text-zaux-dark-grey">{{ nodeName }}</span>
        </p>
        <!-- Focusing the button blurs the field first, which applies the draft like leaving it. -->
        <BuilderButton variant="alt1" icon="close" iconOnly :label="translate('zx_builder_close')" @click="closeQuickStyle()" />
      </div>
      <div data-quick-style-classes>
        <BuilderStyleInput :modelValue="nodeClasses ?? ''" :label="translate('zx_builder_classes')" @update:modelValue="apply" />
      </div>
      <!-- Tabs and controls come from quickStyleTabs (integrations/zaux/controls/quick-style-controls.js). -->
      <BuilderStyleQuickpad :modelValue="nodeClasses ?? ''" :scope="scope" :state="styleState" @update:state="styleState = $event" :target="target.nodeId" :extraTabs="extraTabs" @update:modelValue="change">
        <!-- Same image controls as the Inspector; Zimg keeps them in imgClasses, img in class. -->
        <template #tab-image="{ editor }">
          <BuilderImageStyles compact :nodeName="selectedNode.name" :scope="scope" :state="styleState"
            :modelValue="imageTarget.array ? selectedNode.props.imgClasses : nodeClasses"
            @edit-error="editor.editError.value = $event" @update:modelValue="changeImage" />
        </template>
      </BuilderStyleQuickpad>
      <p class="m-0 text-[10px] text-zaux-dark-grey" @mousedown.prevent>{{ translate('zx_builder_quick_style_keys') }}</p>
    </div>
  </Teleport>
</template>
<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { styleVisibility } from '../../../integrations/zaux/style-visibility.js';
import { imageStyleTarget } from '../../../integrations/zaux/controls/image-style-controls.js';
const EDGE = 8;
// Inline class editor for the node that was selected when Quick style opened (builder.quickStyle).
// Enter, the close button or leaving the panel apply the classes; Escape discards the draft.
// The quickpad below edits the same classes through the shared style controls and applies at once.
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
    // Same scope the Inspector follows: the previewed viewport, or the base when not following it.
    const scope = computed(() => builder.followViewportStyles.value ? builder.viewportStyleScope.value : '');
    function change(value) {
      if (selected()) builder.setNodeClasses(value);
    }
    // Image tab: as in the Inspector, shown for image nodes when the viewport policy allows it.
    const imageTarget = computed(() => imageStyleTarget(builder.selectedNode.value?.name));
    const extraTabs = computed(() => imageTarget.value && styleVisibility(scope.value).image
      ? [{ id: 'image', label: 'zx_builder_style_image' }] : []);
    function changeImage(value) {
      if (!selected()) return;
      if (imageTarget.value?.array) builder.updateNodeStyle({ imgClasses: value });
      else builder.setNodeClasses(value);
    }
    function onKeydown(event) {
      if (event.isComposing) return;
      // The field handles Escape and Enter first while its suggestions are open, and stops them.
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        cancelled = true;
        builder.closeQuickStyle();
      }
      // Enter in a control's custom value only applies that value.
      if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.closest('[data-quick-style-classes]')) builder.closeQuickStyle();
    }
    // Whether the last pointer press landed in the panel.
    let pressedInside = true;
    function onPointerDown(event) { pressedInside = !!panel.value?.contains(event.target); }
    function onFocusOut(event) {
      if (panel.value?.contains(event.relatedTarget)) return;
      if (event.relatedTarget) { builder.closeQuickStyle(); return; }
      // No new target: the window or the canvas took focus, a press outside hit a non-focusable spot,
      // or an edit removed or disabled the focused control. Only the last case keeps the panel.
      setTimeout(() => {
        const element = panel.value;
        if (!element || element.contains(document.activeElement)) return;
        if (pressedInside && document.hasFocus() && document.activeElement === document.body) element.focus({ preventScroll: true });
        else builder.closeQuickStyle();
      });
    }
    // Opens where the context menu was, kept inside the viewport.
    function place() {
      const element = panel.value;
      if (!element) return;
      const width = Math.min(400, window.innerWidth - EDGE * 2);
      element.style.width = `${width}px`;
      const height = element.getBoundingClientRect().height;
      const anchor = target.anchor ?? { left: (window.innerWidth - width) / 2, top: window.innerHeight * 0.3 };
      position.value = {
        width: `${width}px`,
        left: `${Math.max(EDGE, Math.min(anchor.left, window.innerWidth - width - EDGE))}px`,
        top: `${Math.max(EDGE, Math.min(anchor.top, window.innerHeight - height - EDGE))}px`,
      };
    }
    // Opening a tab changes the height: keep the panel inside the viewport.
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => place());
    onMounted(async () => {
      window.addEventListener('resize', place);
      document.addEventListener('pointerdown', onPointerDown, true);
      place();
      if (panel.value) resizeObserver?.observe(panel.value);
      // The panel is hidden until placed and hidden elements cannot take focus: render the position first.
      await nextTick();
      const input = panel.value?.querySelector('input');
      if (!input) return;
      // Ctrl+Alt+S pressed in the canvas iframe: take focus back to the editor document.
      if (document.activeElement?.tagName === 'IFRAME') window.focus();
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
    onBeforeUnmount(() => {
      window.removeEventListener('resize', place);
      document.removeEventListener('pointerdown', onPointerDown, true);
      resizeObserver?.disconnect();
    });
    return { ...builder, panel, position, nodeName, target, scope, apply, change, imageTarget, extraTabs, changeImage, onKeydown, onFocusOut };
  },
});
</script>
