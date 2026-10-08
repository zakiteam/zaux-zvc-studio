import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, shallowRef } from 'vue';
import { containers } from '../services/catalog.js';
import { findNode } from '../../domain/nodes.js';

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
  let scrollFrame = null;
  let scrollArea = null;
  let pointer = null;
  let previousTime = null;
  const wholeBlocks = payload => ['library', 'instance'].includes(payload?.kind) || payload?.kind === 'global' && !payload.zvp
    || payload?.kind === 'selection' && Array.isArray(payload.rows) && payload.rows.some(row => row && !row.nodeId);
  function stopScroll() {
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    scrollFrame = null; scrollArea = null; pointer = null; previousTime = null;
  }
  function refreshScrollTarget() {
    let element = document.elementFromPoint(pointer.x, pointer.y)?.closest('[data-zb-outline-drop]');
    if (wholeBlocks(source.value) && element?.dataset.zbOutlineDrop !== 'instance') element = element?.closest('[data-zb-outline-instance]');
    if (!element || !scrollArea.contains(element)) { setTarget(null); return; }
    cancelLeave();
    const instanceId = element.dataset.zbDropInstance || null;
    const nodeId = element.dataset.zbDropNode || null;
    const instanceRow = element.dataset.zbOutlineDrop === 'instance';
    const definition = builder.mode.value === 'library' ? builder.activeDefinition.value
      : builder.activeTemplate.value.instances.find(item => item.id === instanceId)?.definition;
    const node = nodeId && definition ? findNode(definition.tree, nodeId) : null;
    const next = candidate({ currentTarget: element, clientY: pointer.y }, node, instanceId, instanceRow);
    candidateTarget.value = next;
    targetElement = element;
    setTarget(!source.value || accepts(source.value, next) ? next : null);
  }
  function scrollTick(time) {
    scrollFrame = null;
    if (!scrollArea?.isConnected || !pointer || time - pointer.time > 1000) { stopScroll(); return; }
    const rect = scrollArea.getBoundingClientRect();
    const toolbar = scrollArea.querySelector('[data-zb-outline-tools]');
    const top = Math.max(rect.top, toolbar?.getBoundingClientRect().bottom ?? rect.top);
    const edge = Math.min(48, (rect.bottom - top) / 3);
    const delta = Math.min(32, previousTime === null ? 16 : time - previousTime);
    previousTime = time;
    if (edge > 0 && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom) {
      const speed = pointer.y < top + edge ? -Math.min(1, (top + edge - pointer.y) / edge)
        : pointer.y > rect.bottom - edge ? Math.min(1, (pointer.y - rect.bottom + edge) / edge) : 0;
      const before = scrollArea.scrollTop;
      scrollArea.scrollTop += speed * delta * .65;
      if (before !== scrollArea.scrollTop) refreshScrollTarget();
    }
    scrollFrame = requestAnimationFrame(scrollTick);
  }
  function scrollOver(event) {
    if (!event.dataTransfer.types.includes(mime)) return;
    scrollArea = event.currentTarget;
    pointer = { x: event.clientX, y: event.clientY, time: performance.now() };
    if (scrollFrame === null) scrollFrame = requestAnimationFrame(scrollTick);
  }
  function scrollLeave(event) {
    const next = event.relatedTarget ?? document.elementFromPoint(event.clientX, event.clientY);
    if (!next || !event.currentTarget.contains(next)) stopScroll();
  }
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
    stopScroll();
    source.value = null; candidateTarget.value = null; targetElement = null; setTarget(null);
  }
  function start(event, payload) {
    clear();
    payload = builder.outlineDragPayload(payload);
    source.value = payload;
    event.dataTransfer.setData(mime, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = ['node', 'instance', 'selection'].includes(payload.kind) ? 'move' : 'copy';
  }
  function candidate(event, node, instance, instanceRow) {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = rect.height ? (event.clientY - rect.top) / rect.height : 1;
    const position = node && containers.includes(node.name) && fraction > .25 && fraction < .75
      ? 'inside' : fraction < .5 ? 'before' : 'after';
    return { nodeId: node?.id ?? null, instanceId: instance, position: node || instanceRow ? position : 'after', instanceRow };
  }
  function accepts(payload, next) {
    if (wholeBlocks(payload) && !next.instanceRow) return false;
    return builder.canDropElement(payload, next.nodeId, next.position, next.instanceId);
  }
  function over(event, node, instance, instanceRow = false) {
    if (!event.dataTransfer.types.includes(mime)) return;
    // Whole instances belong to the enclosing card, never to a node row.
    if (!instanceRow && wholeBlocks(source.value)) return;
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
    event.dataTransfer.dropEffect = (source.value ? ['library', 'global', 'catalog', 'clipboard'].includes(source.value.kind) : event.dataTransfer.effectAllowed === 'copy') ? 'copy' : 'move';
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
    if (!instanceRow && wholeBlocks(payload)) return;
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
    window.addEventListener('blur', clear);
  });
  onBeforeUnmount(() => {
    clear();
    window.removeEventListener('dragend', clear);
    window.removeEventListener('drop', clear);
    window.removeEventListener('blur', clear);
  });
  const api = { source, target, start, over, leave, drop, position, scrollOver, scrollLeave };
  provide(key, api);
  return api;
}
