<template>
  <nav v-if="tabs.length" :aria-label="translate('zx_builder_workspace_tabs')" class="min-w-0">
    <div ref="strip" class="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @dragover="dragOver" @drop="drop" @dragleave="leaveStrip" @dragend="clearDrag">
      <div v-for="tab in tabs" :key="tab.key" :data-workspace-tab="tab.key"
        class="group/tab relative flex h-[30px] shrink-0 items-center rounded-xxs text-[11px]"
        :class="[tab.key === activeKey ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:bg-zaux-light/60', { 'opacity-50': draggedKey === tab.key }]">
        <span v-if="dropTarget?.key === tab.key" aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 z-10 w-[2px] bg-zaux-accent"
          :class="dropTarget.after ? 'right-0' : 'left-0'" />
        <button type="button" :title="tab.label + ': ' + tab.name + ' — ' + translate('zx_builder_workspace_tab_reorder')"
          :draggable="!remoteProjectBusy && tabs.length > 1"
          @dragstart="startDrag($event, tab)" @dragend="clearDrag"
          @keydown.alt.left.prevent="moveWithKeyboard(tab, -1)" @keydown.alt.right.prevent="moveWithKeyboard(tab, 1)"
          :aria-current="tab.key === activeKey ? 'page' : undefined" :disabled="remoteProjectBusy"
          class="flex h-full min-w-0 items-center gap-1 rounded-xxs py-0 pl-1.5 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent disabled:opacity-50"
          :class="tabs.length > 1 ? 'pr-0.5' : 'pr-1.5'"
          @click="open(tab)">
          <span class="shrink-0 text-[9px] font-semibold uppercase tracking-wide" :class="tab.key === activeKey ? 'text-zaux-accent' : ''">{{ tab.label }}</span>
          <span class="max-w-[160px] truncate" :class="{ 'font-semibold': tab.key === activeKey }">{{ tab.name }}</span>
        </button>
        <button v-if="tabs.length > 1" type="button"
          :title="translate('zx_builder_workspace_tab_close', { name: tab.name })"
          :aria-label="translate('zx_builder_workspace_tab_close', { name: tab.name })" :disabled="remoteProjectBusy"
          class="mr-0.25 grid h-[20px] w-[20px] place-items-center rounded-xxs text-[14px] leading-none hover:bg-zaux-light-grey/60 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent disabled:opacity-50"
          :class="tab.key === activeKey ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'"
          @click="close(tab)"><span aria-hidden="true">×</span></button>
      </div>
    </div>
  </nav>
</template>
<script>
import { computed, defineComponent, nextTick, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';

export default defineComponent({
  setup() {
    const { document, mode, activeTemplate, activeDefinition, workspaceReady, remoteProjectBusy,
      selectTemplate, selectLibrary, templatesOpen, translate } = useBuilder();
    // Session-only shortcuts. Store identities, never copies of editable entities.
    const opened = ref([]);
    const strip = ref(null);
    const draggedKey = ref(null);
    const dropTarget = ref(null);
    const keyFor = (kind, id) => JSON.stringify([kind, id]);
    const entities = computed(() => [
      ...document.value.templates.map(item => ({ key: keyFor('template', item.id), id: item.id, kind: 'template', name: item.name, label: translate('zx_builder_template') })),
      ...document.value.library.map(item => ({ key: keyFor('library', item.id), id: item.id, kind: 'library', name: item.name, label: item.kind === 'zvp' ? 'ZVP' : 'ZVC' }))
    ]);
    const entityMap = computed(() => new Map(entities.value.map(item => [item.key, item])));
    const tabs = computed(() => opened.value.map(key => entityMap.value.get(key)).filter(Boolean));
    const activeKey = computed(() => {
      const entity = mode.value === 'library' ? activeDefinition.value : activeTemplate.value;
      return entity ? keyFor(mode.value, entity.id) : null;
    });

    function open(tab) {
      if (remoteProjectBusy.value || !entityMap.value.has(tab.key)) return;
      // Re-clicking the current shortcut keeps its node selection intact.
      if (tab.key === activeKey.value) { templatesOpen.value = false; return; }
      if (tab.kind === 'template') selectTemplate(tab.id);
      else selectLibrary(tab.id);
    }

    function clearDrag() {
      draggedKey.value = null;
      dropTarget.value = null;
    }

    function startDrag(event, tab) {
      if (remoteProjectBusy.value || tabs.value.length < 2) { event.preventDefault(); return; }
      draggedKey.value = tab.key;
      event.dataTransfer.setData('application/x-zaux-workspace-tab', tab.key);
      event.dataTransfer.effectAllowed = 'move';
    }

    function dragOver(event) {
      if (!draggedKey.value || remoteProjectBusy.value) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const container = strip.value;
      const bounds = container.getBoundingClientRect();
      // Reveal overflowed tabs while dragging near either edge.
      if (event.clientX < bounds.left + 28) container.scrollLeft -= 16;
      else if (event.clientX > bounds.right - 28) container.scrollLeft += 16;
      const items = Array.from(container.children).filter(item => item.dataset.workspaceTab !== draggedKey.value);
      const before = items.find(item => {
        const rect = item.getBoundingClientRect();
        return event.clientX < rect.left + rect.width / 2;
      });
      const target = before ?? items.at(-1);
      dropTarget.value = target ? { key: target.dataset.workspaceTab, after: !before } : null;
    }

    function leaveStrip(event) {
      if (!strip.value?.contains(event.relatedTarget)) dropTarget.value = null;
    }

    function drop(event) {
      if (!draggedKey.value) return;
      event.preventDefault();
      event.stopPropagation();
      const target = dropTarget.value;
      if (!remoteProjectBusy.value && target && opened.value.includes(draggedKey.value)) {
        const reordered = opened.value.filter(key => key !== draggedKey.value);
        const index = reordered.indexOf(target.key);
        if (index >= 0) {
          reordered.splice(index + (target.after ? 1 : 0), 0, draggedKey.value);
          opened.value = reordered;
        }
      }
      clearDrag();
    }

    function moveWithKeyboard(tab, direction) {
      if (remoteProjectBusy.value) return;
      const index = opened.value.indexOf(tab.key);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= opened.value.length) return;
      const reordered = [...opened.value];
      reordered.splice(index, 1);
      reordered.splice(destination, 0, tab.key);
      opened.value = reordered;
      revealActive(false, tab.key);
    }

    async function revealActive(focus = false, key = activeKey.value) {
      await nextTick();
      const container = strip.value;
      const item = Array.from(container?.children ?? []).find(child => child.dataset.workspaceTab === key);
      if (!item) return;
      if (focus) item.querySelector('button')?.focus({ preventScroll: true });
      const bounds = container.getBoundingClientRect();
      const target = item.getBoundingClientRect();
      if (target.left < bounds.left) container.scrollLeft -= bounds.left - target.left;
      else if (target.right > bounds.right) container.scrollLeft += target.right - bounds.right;
    }

    function close(tab) {
      if (remoteProjectBusy.value || tabs.value.length < 2) return;
      const index = tabs.value.findIndex(item => item.key === tab.key);
      if (tab.key === activeKey.value) open(tabs.value[index + 1] ?? tabs.value[index - 1]);
      opened.value = opened.value.filter(key => key !== tab.key);
      revealActive(true);
    }

    watch(() => document.value.id, () => { opened.value = []; clearDrag(); });
    watch(remoteProjectBusy, busy => { if (busy) clearDrag(); });
    watch([() => document.value.id, workspaceReady, remoteProjectBusy, activeKey, () => entities.value.map(item => item.key)], () => {
      if (!workspaceReady.value || remoteProjectBusy.value) return;
      opened.value = opened.value.filter(key => entityMap.value.has(key));
      if (activeKey.value && entityMap.value.has(activeKey.value)) {
        if (!opened.value.includes(activeKey.value)) opened.value.push(activeKey.value);
      } else {
        // Deleting the edited definition must not leave an empty library canvas.
        const fallback = tabs.value.at(-1) ?? entities.value.find(item => item.kind === 'template');
        if (fallback) open(fallback);
      }
      revealActive();
    }, { immediate: true });

    return { tabs, strip, activeKey, remoteProjectBusy, translate, open, close,
      draggedKey, dropTarget, startDrag, dragOver, drop, leaveStrip, clearDrag, moveWithKeyboard };
  }
});
</script>
