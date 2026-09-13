import { inject, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { containers } from '../services/catalog.js';

const key = Symbol('builder-outline-drag');
const mime = 'application/x-zaux-builder';

export function useBuilderOutlineDrag() { return inject(key); }

export function createBuilderOutlineDrag(builder) {
  const source = ref(null);
  const target = ref(null);
  function clear() { source.value = null; target.value = null; }
  function start(event, payload) {
    clear();
    source.value = payload;
    event.dataTransfer.setData(mime, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = ['node', 'instance'].includes(payload.kind) ? 'move' : 'copy';
  }
  function candidate(event, node, instance, instanceRow) {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = rect.height ? (event.clientY - rect.top) / rect.height : 1;
    const position = node && containers.includes(node.name) && fraction > .25 && fraction < .75
      ? 'inside' : fraction < .5 ? 'before' : 'after';
    return { nodeId: node?.id ?? null, instanceId: instance, position: node || instanceRow ? position : 'after', instanceRow };
  }
  function accepts(payload, next) {
    if (['library', 'instance'].includes(payload.kind) !== next.instanceRow) return false;
    return builder.canDropElement(payload, next.nodeId, next.position, next.instanceId);
  }
  function over(event, node, instance, instanceRow = false) {
    if (!event.dataTransfer.types.includes(mime)) return;
    // Whole instances belong to the enclosing card, never to a node row.
    if (!instanceRow && ['library', 'instance'].includes(source.value?.kind)) return;
    event.stopPropagation();
    const next = candidate(event, node, instance, instanceRow);
    if (!builder.canEditRemote.value || (source.value && !accepts(source.value, next))) {
      target.value = null;
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = ['library', 'catalog'].includes(source.value?.kind) ? 'copy' : 'move';
    target.value = next;
  }
  function leave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) target.value = null;
  }
  function drop(event, node, instance, instanceRow = false) {
    let payload;
    try { payload = JSON.parse(event.dataTransfer.getData(mime)); } catch { clear(); return; }
    if (!payload || typeof payload !== 'object') { clear(); return; }
    if (!instanceRow && ['library', 'instance'].includes(payload.kind)) return;
    event.preventDefault();
    event.stopPropagation();
    const next = candidate(event, node, instance, instanceRow);
    if (accepts(payload, next)) builder.dropElement(payload, next.nodeId, next.position, next.instanceId);
    clear();
  }
  function position(nodeId, instanceId, instanceRow = false) {
    const value = target.value;
    return value && value.nodeId === nodeId && value.instanceId === instanceId && value.instanceRow === instanceRow ? value.position : null;
  }
  onMounted(() => {
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('dragend', clear);
    window.removeEventListener('drop', clear);
  });
  const api = { source, target, start, over, leave, drop, position };
  provide(key, api);
  return api;
}
