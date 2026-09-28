import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, shallowRef } from 'vue';
import { containers } from '../services/catalog.js';

const key = Symbol('builder-outline-drag');
const mime = 'application/x-zaux-builder';

export function useBuilderOutlineDrag() { return inject(key); }

export function createBuilderOutlineDrag(builder) {
  const source = shallowRef(null);
  const target = shallowRef(null);
  const candidateTarget = shallowRef(null);
  // Track each row separately so moving a marker does not invalidate every tree.
  const positions = reactive(new Map());
  let targetElement = null;
  let leaveFrame = null;
  const allowed = computed(() => builder.canEditRemote.value && !!candidateTarget.value
    && (!source.value || accepts(source.value, candidateTarget.value)));
  function targetKey(value) { return JSON.stringify([value.nodeId, value.instanceId, value.instanceRow]); }
  function sameTarget(first, second) {
    return first === second || !!first && !!second && first.nodeId === second.nodeId
      && first.instanceId === second.instanceId && first.instanceRow === second.instanceRow && first.position === second.position;
  }
  function setTarget(next) {
    if (sameTarget(target.value, next)) return;
    if (target.value) positions.delete(targetKey(target.value));
    target.value = next;
    if (next) positions.set(targetKey(next), next.position);
  }
  function cancelLeave() { if (leaveFrame !== null) cancelAnimationFrame(leaveFrame); leaveFrame = null; }
  function clear() {
    cancelLeave();
    source.value = null; candidateTarget.value = null; targetElement = null; setTarget(null);
  }
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
    cancelLeave();
    targetElement = event.currentTarget;
    const next = candidate(event, node, instance, instanceRow);
    if (!sameTarget(candidateTarget.value, next)) candidateTarget.value = next;
    if (!allowed.value) {
      setTarget(null);
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = (source.value ? ['library', 'catalog', 'clipboard'].includes(source.value.kind) : event.dataTransfer.effectAllowed === 'copy') ? 'copy' : 'move';
    setTarget(next);
  }
  function leave(event) {
    if (event.currentTarget !== targetElement || event.currentTarget.contains(event.relatedTarget)) return;
    // A child can emit dragleave just before the next row's dragover.
    cancelLeave();
    leaveFrame = requestAnimationFrame(() => { leaveFrame = null; targetElement = null; setTarget(null); });
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
    return positions.get(targetKey({ nodeId, instanceId, instanceRow })) ?? null;
  }
  onMounted(() => {
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
  });
  onBeforeUnmount(() => {
    clear();
    window.removeEventListener('dragend', clear);
    window.removeEventListener('drop', clear);
  });
  const api = { source, target, start, over, leave, drop, position };
  provide(key, api);
  return api;
}
