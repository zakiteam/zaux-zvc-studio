<template>
  <aside class="zb-sidebar flex min-h-0 w-[254px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white max-[1200px]:w-[230px] max-[900px]:h-[80dvh] max-[900px]:!w-[210px]" :style="{ width: `${width}px` }">
    <div class="zb-tabs flex shrink-0 gap-0.5 border-b-slim border-zaux-light-grey px-1.5 [&>button]:flex-1 [&>button]:border-b-thick [&>button]:border-transparent [&>button]:px-0.75 [&>button]:py-1.5 [&>button]:text-[11px] [&>button]:text-zaux-dark-grey [&>button.active]:border-zaux-accent [&>button.active]:text-zaux-accent" role="tablist">
      <button v-for="tab in ['library', 'elements', 'outline']" :key="tab" role="tab" :aria-selected="leftTab === tab" :class="{ active: leftTab === tab }" @click="leftTab = tab">{{ translate(`zx_builder_${tab}`) }}</button>
    </div>
    <ZOverflowContainer class="zb-scroll h-full min-h-0 flex-1 overflow-auto" autoOverflow>
      <div v-if="leftTab === 'library'" class="zb-library-panel px-2 py-2.5">
        <div class="zb-panel-heading mb-2 flex items-center justify-between [&_h2]:text-[16px] [&_h2]:font-medium [&_h2]:tracking-[-0.4px] [&_p]:mt-0.5 [&_p]:text-[10px] [&_p]:text-zaux-dark-grey"><div><h2>{{ translate('zx_builder_library') }}</h2><p>{{ document.library.length }} ZVC</p></div><BuilderButton icon="add" iconOnly :label="translate('zx_builder_new_component')" @click="modal = { type: 'new-component' }" /></div>
        <BuilderButton icon="add" :label="translate('zx_builder_new_component_json')" :disabled="!canEditRemote" @click="modal = { type: 'new-component-json' }" />
        <p v-if="!document.library.length" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_library_empty') }}</p>
        <article v-for="(definition, index) in document.library" :key="definition.id" class="zb-library-card mb-2 overflow-hidden rounded-xs border-slim border-zaux-light-grey transition-colors hover:border-zaux-accent [&.active]:border-zaux-accent" :class="{ active: mode === 'library' && libraryId === definition.id }" draggable="true" @dragstart="drag($event, { kind: 'library', id: definition.id })">
          <button class="zb-library-thumb relative grid h-[112px] w-full place-items-center overflow-hidden bg-zaux-light [&.zb-library-thumb--1]:bg-zaux-light-grey/30 [&.zb-library-thumb--2]:bg-zaux-accent/10" :class="`zb-library-thumb--${index % 3}`" :aria-label="`${translate('zx_builder_edit_library')}: ${definition.name}`" @click="selectLibrary(definition.id)"><span class="zb-mini-layout relative h-[78px] w-[140px] -rotate-3 rounded-xxs bg-zaux-white px-1.5 py-2 shadow-closer [&>i]:my-0.75 [&>i]:block [&>i]:h-[5px] [&>i]:w-[55px] [&>i]:rounded-[1px] [&>i]:bg-zaux-light-grey [&>i:nth-child(2)]:w-[38px] [&>i:nth-child(3)]:h-[9px] [&>i:nth-child(3)]:w-[22px] [&>i:nth-child(3)]:bg-zaux-accent [&>b]:absolute [&>b]:right-1.5 [&>b]:top-2 [&>b]:h-[50px] [&>b]:w-[47px] [&>b]:rounded-t-l [&>b]:rounded-b-xxs [&>b]:bg-zaux-light-accent/30"><i></i><i></i><i></i><b></b></span><span class="zb-card-type absolute right-1 top-1 rounded-xxs bg-zaux-white/70 px-0.5 py-0.25 font-mono text-[8px] text-zaux-dark-grey">{{ definition.sourceKey ? translate('zx_builder_from_code') : 'ZVC' }}</span></button>
          <div class="zb-card-body px-1.5 pb-1 pt-1.5 [&>small]:mt-0.5 [&>small]:block [&>small]:font-mono [&>small]:text-[9px] [&>small]:text-zaux-dark-grey"><button class="zb-card-name block w-full text-left text-[12px] font-semibold" @click="selectLibrary(definition.id)">{{ definition.name }}</button><small>{{ definition.exportName }}</small>
            <div class="zb-card-actions mt-1.5 flex items-center gap-0.5 border-t-slim border-zaux-light pt-0.75 [&>.zb-button]:flex-1 [&>.zb-button]:!px-0.25 [&>.zb-button]:!text-[10px]"><BuilderButton :label="translate('zx_builder_add_to_template')" icon="add" @click="insertInstance(definition.id)" /><button v-if="!definition.id.startsWith('source:')" class="zb-icon-text w-[18px] text-zaux-dark-grey hover:text-zaux-accent" :aria-label="`${translate('zx_builder_rename')}: ${definition.name}`" @click="modal = { type: 'rename', kind: 'library', id: definition.id, name: definition.name }">✎</button><button v-if="!definition.id.startsWith('source:')" class="zb-icon-text w-[18px] text-zaux-dark-grey hover:text-zaux-accent" :aria-label="`${translate('zx_builder_delete')}: ${definition.name}`" @click="modal = { type: 'delete', kind: 'library', id: definition.id }">×</button></div>
          </div>
        </article>
        <p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_library_drag') }}</p>
      </div>
      <div v-else-if="leftTab === 'elements'" class="zb-elements-panel px-2 py-2.5 [&>input]:mb-0.5 [&_h3]:mb-1 [&_h3]:mt-3">
        <BuilderInput v-model="search" type="search" :placeholder="translate('zx_builder_search')" :label="translate('zx_builder_search')" />
        <p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_drag_hint') }}</p><p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_palette_hint') }}</p>
        <div v-for="group in ['zx_builder_zaux', 'zx_builder_native']" :key="group"><h3 class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate(group) }}</h3>
          <div class="zb-element-list flex flex-col gap-0.5 [&>button]:flex [&>button]:cursor-grab [&>button]:items-center [&>button]:gap-1.5 [&>button]:rounded-xxs [&>button]:border-slim [&>button]:border-zaux-light-grey [&>button]:p-1.5 [&>button]:text-left [&>button]:text-[11px] [&>button:hover]:border-zaux-accent [&>button:hover]:bg-zaux-light"><button v-for="entry in filtered.filter(item => item.group === group)" :key="entry.name" draggable="true" @dragstart="drag($event, { kind: 'catalog', name: entry.name })" @click="addElement(entry.name)"><span class="zb-element-icon grid h-[24px] w-[24px] place-items-center rounded-xxs bg-zaux-light text-[17px] text-zaux-accent">{{ containers.includes(entry.name) ? '▤' : '◇' }}</span><span>{{ entry.name }}</span><span class="zb-drag-grip ml-auto text-zaux-light-grey">⠿</span></button></div>
        </div><p v-if="!filtered.length" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_empty_search') }}</p>
      </div>
      <div v-else class="zb-outline-panel px-2 py-2.5">
        <template v-if="mode === 'library'"><h3 class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ activeDefinition?.name }}</h3><p v-if="activeDefinition?.sourceKey" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_source_outline') }}</p><BuilderTree v-else-if="activeDefinition" :nodes="activeDefinition.tree" instance="library" /></template>
        <template v-else><article v-for="instance in activeTemplate.instances" :key="instance.id" class="zb-instance mb-2 rounded-xxs border-slim border-zaux-light-grey p-1 [&.active]:border-zaux-accent" :class="{ active: instanceId === instance.id }" draggable="true" @dragstart.stop="drag($event, { kind: 'instance', id: instance.id })" @dragover.prevent @drop.stop.prevent="dropOnInstance($event, instance.id)">
          <div class="zb-instance-heading flex min-w-0 items-center gap-0.25"><button class="zb-instance-name flex min-w-0 flex-1 items-center gap-1 truncate px-0.25 py-0.5 text-left !text-[11px] font-medium [&>span]:text-zaux-dark-grey" @click="selectInstance(instance.id)"><span>⠿</span>{{ instance.name }}</button><div class="zb-instance-tools flex shrink-0 items-center gap-[1px] [&>.zb-button]:!min-w-[25px] [&>.zb-button]:!w-[25px] [&>.zb-button]:!p-0.5"><BuilderButton icon="duplicate" iconOnly :label="`${translate('zx_builder_duplicate')}: ${instance.name}`" @click="duplicate('instance', instance.id)" /><BuilderButton icon="delete" iconOnly :label="`${translate('zx_builder_delete')}: ${instance.name}`" @click="remove('instance', instance.id)" /></div></div>
          <div v-if="instanceId === instance.id" class="zb-instance-actions flex justify-between gap-0.5 pb-1.5 pt-0.5 text-[9px] text-zaux-dark-grey [&>button:hover]:text-zaux-accent"><button @click="modal = { type: 'rename', kind: 'instance', id: instance.id, name: instance.name }">{{ translate('zx_builder_rename') }}</button></div>
          <button v-if="instance.definition.sourceKey" class="zb-source-outline px-1.5 py-1 text-left text-[10px] text-zaux-accent" @click="selectInstance(instance.id)">{{ translate('zx_builder_source_outline') }}</button><BuilderTree v-else :nodes="instance.definition.tree" :instance="instance.id" />
        </article></template>
      </div>
    </ZOverflowContainer>
    <div class="zb-sidebar-footer flex items-center justify-between border-t-slim border-zaux-light-grey px-2 py-1.5 text-[11px] text-zaux-dark-grey [&>select]:w-[58px] [&>select]:p-0.5 [&>select]:text-[10px] [&_small]:ml-0.5 [&_small]:text-[9px]"><span>Zaux Studio <small>0.1</small></span><BuilderInput class="!w-[58px] !p-0.5 !text-[10px]" type="select" :modelValue="language" :label="translate('zx_builder_language')" :options="[{ value: 'it', label: 'IT' }, { value: 'en', label: 'EN' }]" @update:modelValue="setLanguage" /></div>
  </aside>
</template>
<script>
import { defineComponent, computed, ref } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { catalog, containers } from '../../services/catalog.js';
import BuilderButton from './BuilderButton.vue';
import BuilderTree from './BuilderTree.vue';
import BuilderInput from './BuilderInput.vue';
export default defineComponent({
  components: { BuilderButton, BuilderTree, BuilderInput },
  props: { width: { default: 254 } },
  setup() {
    const builder = useBuilder();
    const search = ref('');
    const filtered = computed(() => catalog.filter(entry => entry.name.toLowerCase().includes(search.value.toLowerCase())));
    function drag(event, payload) { event.dataTransfer.setData('application/x-zaux-builder', JSON.stringify(payload)); event.dataTransfer.effectAllowed = payload.kind === 'instance' ? 'move' : 'copyMove'; }
    function dropOnInstance(event, id) { try { const payload = JSON.parse(event.dataTransfer.getData('application/x-zaux-builder')); builder.dropElement(payload, null, 'before', id); } catch { /* Ignore external drags. */ } }
    return { ...builder, search, filtered, containers, drag, dropOnInstance };
  }
});
</script>
