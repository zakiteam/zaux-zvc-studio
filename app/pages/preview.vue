<template>
  <div class="zb-stage relative min-h-screen [&.zb-stage--editing_[data-zb-node]]:cursor-grab [&.zb-stage--editing_[data-zb-node]:hover]:outline [&.zb-stage--editing_[data-zb-node]:hover]:outline-[1px] [&.zb-stage--editing_[data-zb-node]:hover]:outline-dashed [&.zb-stage--editing_[data-zb-node]:hover]:outline-zaux-accent/50" :class="{ 'zb-stage--editing': state.editable }" @click.capture="select" @submit.prevent @dragstart="startDrag" @dragover.prevent="dragOver" @dragleave="dragLeave" @drop.prevent="drop">
    <component :is="'style'">{{ state.css }} {{ componentCss }}</component>
    <div v-if="!state.instances.length" class="zb-stage-empty flex min-h-[300px] flex-col items-center justify-center gap-2 border-slim border-dashed border-zaux-light-grey bg-zaux-light px-3 py-8 text-center font-main [&>h1]:text-[30px] [&>h2]:text-[30px] [&>h1]:leading-[1.25] [&>h2]:leading-[1.25] [&>p]:max-w-[300px] [&>p]:text-[13px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"><div class="zb-empty-symbol grid h-[45px] w-[45px] place-items-center rounded-s bg-zaux-accent/10 text-[28px] text-zaux-accent">+</div><h1>{{ translate('zx_builder_empty_template') }}</h1><p>{{ translate('zx_builder_empty_hint') }}</p></div>
    <section v-for="instance in state.instances" :key="instance.id" :data-zb-instance="instance.id" class="zb-stage-instance min-h-[12px]" :class="{ 'zb-stage-instance--empty': !instance.definition.tree.length }">
      <PreviewBoundary :key="JSON.stringify([instance, state.styles?.uiSettings])" :message="translate('zx_builder_preview_error')"><ComponentsRenderer :components="previewNodes(instance, state.editable)" /></PreviewBoundary>
      <div v-if="!instance.definition.tree.length" class="zb-stage-empty flex min-h-[300px] flex-col items-center justify-center gap-2 border-slim border-dashed border-zaux-light-grey bg-zaux-light px-3 py-8 text-center font-main [&>h1]:text-[30px] [&>h2]:text-[30px] [&>h1]:leading-[1.25] [&>h2]:leading-[1.25] [&>p]:max-w-[300px] [&>p]:text-[13px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"><span class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ instance.name }}</span><h2>{{ translate('zx_builder_empty_tree') }}</h2></div>
    </section>
    <div v-if="selection && state.editable" class="zb-selection-box pointer-events-none absolute z-[900] box-border border-thick border-zaux-accent [&>span]:absolute [&>span]:-left-[2px] [&>span]:top-0 [&>span]:-translate-y-full [&>span]:whitespace-nowrap [&>span]:rounded-t-xxs [&>span]:bg-zaux-accent [&>span]:px-1 [&>span]:py-0.5 [&>span]:font-main [&>span]:text-[10px] [&>span]:text-zaux-white" :style="selection.style"><span>{{ selection.name }}</span></div>
    <div v-if="dropMarker && state.editable" class="zb-drop-marker pointer-events-none absolute z-[1000] bg-zaux-accent [&.zb-drop-marker--inside]:border-thick [&.zb-drop-marker--inside]:border-zaux-accent [&.zb-drop-marker--inside]:bg-zaux-accent/10 [&>span]:absolute [&>span]:left-0.5 [&>span]:top-0.5 [&>span]:bg-zaux-accent [&>span]:px-1 [&>span]:py-0.5 [&>span]:font-main [&>span]:text-[10px] [&>span]:text-zaux-white" :class="{ 'zb-drop-marker--inside': dropMarker.position === 'inside' }" :style="dropMarker.style"><span>{{ translate(`zx_builder_${dropMarker.position}`) }}</span></div>
  </div>
</template>
<script>
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { createStyleBridge } from '../services/styles.js';
import { previewNodes } from '../services/preview.js';
import { findNode } from '../../domain/nodes.js';
import { containers } from '../services/catalog.js';
import { useTranslation } from '../composables/useTranslation.js';
import PreviewBoundary from '../components/builder/PreviewBoundary.vue';
export default defineComponent({
  components: { PreviewBoundary },
  setup() {
    const translation = useTranslation();
    const styleBridge = createStyleBridge();
    const state = ref({ instances: [], editable: true, css: '', selectedNodeId: null, selectedInstanceId: null });
    const selection = ref(null);
    const dropMarker = ref(null);
    const componentCss = computed(() => state.value.instances.map(item => item.definition.css).join('\n'));
    let observer;
    function post(message) { window.parent.postMessage({ channel: 'zaux-studio', ...message }, window.location.origin); }
    async function receive(event) {
      if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.channel !== 'zaux-studio' || event.data.type !== 'state') return;
      if (event.data.styles) styleBridge.apply(event.data.styles);
      state.value = event.data;
      translation.language.value = event.data.language;
      await nextTick(); measureSelection();
    }
    function context(target) {
      const element = target.closest('[data-zb-node]');
      const section = target.closest('[data-zb-instance]');
      const instanceId = section?.dataset.zbInstance ?? state.value.instances.at(-1)?.id;
      const instance = state.value.instances.find(item => item.id === instanceId);
      const node = instance && element ? findNode(instance.definition.tree, element.dataset.zbNode) : null;
      return { element, section, instanceId, node };
    }
    function select(event) {
      if (state.value.editable) {
        event.preventDefault(); event.stopPropagation();
        const target = context(event.target);
        post({ type: 'select', instanceId: target.instanceId, nodeId: target.node?.id ?? null });
      } else if (event.target.closest('a')) event.preventDefault();
    }
    function measureSelection() {
      const id = state.value.selectedNodeId;
      const selector = id ? `[data-zb-node="${CSS.escape(id)}"]` : `[data-zb-instance="${CSS.escape(state.value.selectedInstanceId ?? '')}"]`;
      const element = document.querySelector(selector);
      if (!element || !state.value.editable) { selection.value = null; return; }
      const rect = element.getBoundingClientRect();
      const instance = state.value.instances.find(item => item.id === state.value.selectedInstanceId);
      const name = id && instance ? findNode(instance.definition.tree, id)?.name : instance?.name;
      selection.value = { name, style: { top: `${rect.top + window.scrollY}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` } };
    }
    function startDrag(event) {
      if (!state.value.editable) { event.preventDefault(); return; }
      const target = context(event.target);
      if (!target.node) return;
      event.stopPropagation();
      event.dataTransfer.setData('application/x-zaux-builder', JSON.stringify({ kind: 'node', id: target.node.id, instanceId: target.instanceId }));
      event.dataTransfer.effectAllowed = 'move';
    }
    function dragOver(event) {
      if (!state.value.editable || !event.dataTransfer.types.includes('application/x-zaux-builder')) return;
      const target = context(event.target);
      const rect = (target.element ?? target.section ?? event.currentTarget).getBoundingClientRect();
      const fraction = rect.height ? (event.clientY - rect.top) / rect.height : 1;
      const position = target.node && containers.includes(target.node.name) && fraction > .25 && fraction < .75 ? 'inside' : fraction < .5 ? 'before' : 'after';
      dropMarker.value = { instanceId: target.instanceId, nodeId: target.node?.id ?? null, position, style: { top: `${window.scrollY + rect.top + (position === 'after' ? rect.height : 0)}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: position === 'inside' ? `${rect.height}px` : '3px' } };
    }
    function dragLeave(event) { if (!event.relatedTarget) dropMarker.value = null; }
    function drop(event) {
      if (!state.value.editable) return;
      try {
        const payload = JSON.parse(event.dataTransfer.getData('application/x-zaux-builder'));
        const target = dropMarker.value ?? { instanceId: state.value.instances.at(-1)?.id, nodeId: null, position: 'after' };
        post({ type: 'drop', payload, instanceId: target.instanceId, nodeId: target.nodeId, position: target.position });
      } catch { /* Ignore drags from outside the builder. */ }
      dropMarker.value = null;
    }
    onMounted(() => {
      document.body.classList.add('zb-preview-body');
      window.addEventListener('message', receive); window.addEventListener('resize', measureSelection); window.addEventListener('scroll', measureSelection);
      observer = new ResizeObserver(measureSelection); observer.observe(document.body);
      post({ type: 'ready' });
    });
    onBeforeUnmount(() => { styleBridge.dispose(); window.removeEventListener('message', receive); window.removeEventListener('resize', measureSelection); window.removeEventListener('scroll', measureSelection); observer?.disconnect(); document.body.classList.remove('zb-preview-body'); });
    return { ...translation, state, selection, dropMarker, componentCss, previewNodes, select, startDrag, dragOver, dragLeave, drop };
  }
});
</script>
