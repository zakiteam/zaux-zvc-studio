<template>
  <!-- DevTools-like box model, drawn in document coordinates inside the preview stage. -->
  <div v-if="boxes.length" class="zb-css-inspector pointer-events-none absolute left-0 top-0 z-[898] font-builder" aria-hidden="true">
    <template v-for="item in boxes" :key="item.key">
      <div v-for="layer in item.layers" :key="layer.name" class="absolute box-border border-solid" :style="layer.style" />
      <span v-for="label in item.labels" :key="label.key"
        class="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xxs bg-zaux-white/85 px-0.25 text-[9px] leading-[1.2] tabular-nums text-zaux-dark"
        :style="label.style">{{ label.text }}</span>
      <span class="absolute -translate-x-1/2 whitespace-nowrap rounded-xxs bg-zaux-dark px-0.5 py-0.25 text-[10px] leading-none tabular-nums text-zaux-white"
        :style="item.sizeStyle">{{ item.size }}</span>
    </template>
  </div>
  <div v-if="details" ref="panel" data-zb-css-details
    class="pointer-events-none fixed z-[1002] w-max max-w-[300px] rounded-xxs bg-zaux-dark px-1 py-0.5 font-builder text-[10px] leading-[1.5] text-zaux-white shadow-deep"
    :style="detailsStyle">
    <div class="mb-0.25 flex min-w-0 items-baseline gap-1">
      <span class="min-w-0 truncate font-semibold">{{ details.name }}</span>
      <span class="shrink-0 font-mono opacity-60">{{ details.tag }}</span>
    </div>
    <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1">
      <template v-for="row in details.rows" :key="row.name">
        <dt class="opacity-60">{{ row.label }}</dt>
        <dd class="flex min-w-0 items-center gap-0.5 font-mono">
          <span v-if="row.swatch" class="h-[8px] w-[8px] shrink-0 rounded-full border-slim border-zaux-white/40" :style="{ background: row.swatch }" />
          <span class="min-w-0 truncate">{{ row.value }}</span>
        </dd>
      </template>
    </dl>
  </div>
</template>
<script>
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { cssInspectorColors, cssInspectorProperties } from '../../data/css-inspector.js';
import { useTranslation } from '../../composables/useTranslation.js';

const SIDES = ['top', 'right', 'bottom', 'left'];
const number = value => Number.parseFloat(value) || 0;
const round = value => Math.round(value * 100) / 100;
const sides = (style, prefix, suffix = '') => Object.fromEntries(SIDES.map(side => [side, number(style.getPropertyValue(`${prefix}-${side}${suffix}`))]));
const shorthand = values => SIDES.map(side => round(values[side])).join(' ');
const transparent = value => value === 'transparent' || /^rgba\(.*,\s*0\)$/.test(value);

export default defineComponent({
  props: {
    // Toggle mode: selected node stays highlighted, hovered nodes show box model and details.
    enabled: Boolean,
    // Programmatic highlight, shown even with the mode off: { instanceId, nodeId, details, properties }.
    highlight: { type: Object, default: null },
    selectedInstanceId: { type: String, default: null },
    selectedNodeId: { type: String, default: null },
    // Computed properties listed in the details panel.
    properties: { type: Array, default: () => cssInspectorProperties },
    colors: { type: Object, default: () => cssInspectorColors },
    // Bumped by the stage after each render so the boxes follow the new layout.
    revision: { type: Number, default: 0 },
    nameOf: { type: Function, default: null },
  },
  setup(props) {
    const { translate } = useTranslation();
    const boxes = shallowRef([]);
    const details = shallowRef(null);
    const detailsStyle = ref({ visibility: 'hidden' });
    const panel = ref(null);
    let pointerTarget = null;
    let frame = null;
    let observer;

    const active = () => props.enabled || !!props.highlight?.nodeId;
    function nodeElement(instanceId, nodeId) {
      if (!nodeId) return null;
      const section = instanceId ? document.querySelector(`[data-zb-instance="${CSS.escape(instanceId)}"]`) : null;
      return (section ?? document).querySelector(`[data-zb-node="${CSS.escape(nodeId)}"]`);
    }
    function describe(element, extra = {}) {
      return { element, instanceId: element.closest('[data-zb-instance]')?.dataset.zbInstance ?? null, nodeId: element.dataset.zbNode, ...extra };
    }
    function pinnedTarget() {
      const highlight = props.highlight?.nodeId ? props.highlight : null;
      const target = highlight ?? (props.enabled && props.selectedNodeId ? { instanceId: props.selectedInstanceId, nodeId: props.selectedNodeId } : null);
      const element = target && nodeElement(target.instanceId, target.nodeId);
      return element ? describe(element, { details: !!highlight?.details, properties: highlight?.properties ?? null }) : null;
    }
    function metricsOf(element) {
      const style = getComputedStyle(element);
      return { rect: element.getBoundingClientRect(), style, margin: sides(style, 'margin'), border: sides(style, 'border', '-width'), padding: sides(style, 'padding') };
    }
    function overlay({ rect, margin, border, padding }) {
      const x = rect.left + window.scrollX, y = rect.top + window.scrollY, w = rect.width, h = rect.height;
      // Negative margins pull the element; only the positive part has an area to paint.
      const outer = Object.fromEntries(SIDES.map(side => [side, Math.max(0, margin[side])]));
      const inner = { left: x + border.left, top: y + border.top, width: w - border.left - border.right, height: h - border.top - border.bottom };
      // A border-box div whose border widths match the spacing paints exactly that ring.
      const ring = (left, top, width, height, widths, color) => ({
        left: `${left}px`, top: `${top}px`, width: `${Math.max(0, width)}px`, height: `${Math.max(0, height)}px`,
        borderColor: color, borderWidth: SIDES.map(side => `${Math.max(0, widths[side])}px`).join(' ')
      });
      const colors = { ...cssInspectorColors, ...props.colors };
      const layers = [
        { name: 'margin', style: ring(x - outer.left, y - outer.top, w + outer.left + outer.right, h + outer.top + outer.bottom, outer, colors.margin) },
        { name: 'border', style: ring(x, y, w, h, border, colors.border) },
        { name: 'padding', style: ring(inner.left, inner.top, inner.width, inner.height, padding, colors.padding) },
        { name: 'content', style: {
          left: `${inner.left + padding.left}px`, top: `${inner.top + padding.top}px`, background: colors.content,
          width: `${Math.max(0, inner.width - padding.left - padding.right)}px`, height: `${Math.max(0, inner.height - padding.top - padding.bottom)}px`
        } },
      ];
      const labels = [];
      const label = (key, value, left, top) => { if (value) labels.push({ key, text: round(value), style: { left: `${left}px`, top: `${top}px` } }); };
      label('mt', margin.top, x + w / 2, y - outer.top / 2);
      label('mb', margin.bottom, x + w / 2, y + h + outer.bottom / 2);
      label('ml', margin.left, x - outer.left / 2, y + h / 2);
      label('mr', margin.right, x + w + outer.right / 2, y + h / 2);
      label('pt', padding.top, inner.left + inner.width / 2, inner.top + padding.top / 2);
      label('pb', padding.bottom, inner.left + inner.width / 2, inner.top + inner.height - padding.bottom / 2);
      label('pl', padding.left, inner.left + padding.left / 2, inner.top + inner.height / 2);
      label('pr', padding.right, inner.left + inner.width - padding.right / 2, inner.top + inner.height / 2);
      return { layers, labels, size: `${round(w)} × ${round(h)}`, sizeStyle: { left: `${x + w / 2}px`, top: `${y + h + outer.bottom + 4}px` } };
    }
    function detailRows({ rect, style, margin, border, padding }, properties) {
      const content = [rect.width - border.left - border.right - padding.left - padding.right, rect.height - border.top - border.bottom - padding.top - padding.bottom];
      const rows = [
        { name: 'size', label: translate('zx_builder_css_inspect_size'), value: `${round(rect.width)} × ${round(rect.height)}` },
        { name: 'content', label: translate('zx_builder_css_inspect_content'), value: content.map(value => round(Math.max(0, value))).join(' × ') },
        { name: 'margin', label: 'margin', value: shorthand(margin) },
        { name: 'padding', label: 'padding', value: shorthand(padding) },
      ];
      if (SIDES.some(side => border[side])) rows.push({ name: 'border', label: 'border', value: shorthand(border) });
      for (const property of properties) {
        const value = style.getPropertyValue(property).trim();
        if (!value || rows.some(row => row.name === 'css:' + property)) continue;
        rows.push({ name: 'css:' + property, label: property, value, swatch: property.endsWith('color') && !transparent(value) ? value : null });
      }
      return rows;
    }
    function positionPanel(rect) {
      if (!panel.value) return;
      const { width, height } = panel.value.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth, viewportHeight = window.innerHeight;
      const left = Math.max(4, Math.min(rect.left, viewportWidth - width - 4));
      const below = rect.bottom + 8, above = rect.top - height - 8;
      const top = below + height <= viewportHeight - 4 ? below : above >= 4 ? above : Math.max(4, viewportHeight - height - 4);
      detailsStyle.value = { left: `${left}px`, top: `${top}px` };
    }
    async function measure() {
      const pinned = pinnedTarget();
      const hoveredElement = pointerTarget?.isConnected ? pointerTarget.closest('[data-zb-node]') : null;
      const hovered = props.enabled && hoveredElement ? describe(hoveredElement) : null;
      const targets = [pinned, hovered && hovered.element !== pinned?.element ? hovered : null].filter(Boolean);
      // With the mode off, details appear while the pointer is anywhere over the highlighted node.
      const detailTarget = hovered ?? (pinned && (pinned.details || pinned.element.contains(pointerTarget)) ? pinned : null);
      if (!targets.length && !boxes.value.length && !details.value) return;
      const measured = new Map(targets.map(target => [target.element, metricsOf(target.element)]));
      boxes.value = targets.map((target, index) => ({ key: `${index}:${target.nodeId}`, ...overlay(measured.get(target.element)) }));
      if (!detailTarget) { details.value = null; detailsStyle.value = { visibility: 'hidden' }; return; }
      const metrics = measured.get(detailTarget.element);
      details.value = {
        name: props.nameOf?.(detailTarget.instanceId, detailTarget.nodeId) || detailTarget.nodeId,
        tag: detailTarget.element.tagName.toLowerCase(),
        rows: detailRows(metrics, detailTarget.properties ?? props.properties),
      };
      await nextTick();
      positionPanel(metrics.rect);
    }
    function schedule() {
      if (frame !== null || (!active() && !boxes.value.length && !details.value)) return;
      frame = requestAnimationFrame(() => { frame = null; measure(); });
    }
    function pointerOver(event) {
      if (event.target?.closest?.('[data-zb-toolbar]')) return;
      pointerTarget = event.target;
      schedule();
    }
    function pointerOut(event) {
      if (event.relatedTarget) return;
      pointerTarget = null;
      schedule();
    }
    watch(() => [props.enabled, props.highlight, props.selectedInstanceId, props.selectedNodeId, props.properties, props.colors, props.revision], () => {
      if (frame === null) frame = requestAnimationFrame(() => { frame = null; measure(); });
    }, { deep: true });
    onMounted(() => {
      document.addEventListener('mouseover', pointerOver);
      document.addEventListener('mouseout', pointerOut);
      window.addEventListener('resize', schedule);
      window.addEventListener('scroll', schedule, true);
      observer = new ResizeObserver(schedule); observer.observe(document.body);
    });
    onBeforeUnmount(() => {
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener('mouseover', pointerOver);
      document.removeEventListener('mouseout', pointerOut);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      observer?.disconnect();
    });
    return { boxes, details, detailsStyle, panel };
  }
});
</script>
