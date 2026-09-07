<template>
  <ul class="zb-tree my-0.5 list-none p-0 [&.zb-tree--nested]:ml-1 [&.zb-tree--nested]:border-l-slim [&.zb-tree--nested]:border-zaux-light-grey [&.zb-tree--nested]:pl-0.75" :class="{ 'zb-tree--nested': depth }">
    <li v-for="node in nodes" :key="node.id">
      <div class="zb-tree-item flex min-w-0 items-center gap-0.25 rounded-xxs hover:bg-zaux-light focus-within:bg-zaux-light [&.active]:bg-zaux-accent/5" :class="{ active: nodeId === node.id && (mode === 'library' || instanceId === instance) }" @dragover.prevent.stop @drop.stop.prevent="drop($event, node)">
        <button class="zb-tree-row flex min-w-0 flex-1 items-center gap-1 rounded-xxs px-0.5 py-1 text-left !text-[10px] [&>span:nth-child(2)]:truncate [&>span:first-child]:text-zaux-dark-grey [&>small]:ml-auto [&>small]:text-[9px] [&>small]:text-zaux-dark-grey [&.active]:text-zaux-accent" :class="{ active: nodeId === node.id && (mode === 'library' || instanceId === instance) }" draggable="true" @click="selectInstance(instance, node.id)" @dragstart.stop="startDrag($event, node.id)"><span>{{ node.children.length ? '▾' : '◇' }}</span><span>{{ node.name }}</span><small v-if="node.children.length">{{ node.children.length }}</small></button>
        <div class="zb-tree-actions flex shrink-0 items-center gap-[1px] [&>.zb-button]:!min-w-[25px] [&>.zb-button]:!w-[25px] [&>.zb-button]:!p-0.5">
          <BuilderButton icon="duplicate" iconOnly :label="`${translate('zx_builder_duplicate')}: ${node.name}`" @click.stop="duplicateHere(node.id)" />
          <BuilderButton icon="delete" iconOnly :label="`${translate('zx_builder_delete')}: ${node.name}`" @click.stop="deleteHere(node.id)" />
        </div>
      </div>
      <BuilderTree v-if="node.children.length" :nodes="node.children" :instance="instance" :depth="depth + 1" />
    </li>
    <li v-if="!nodes.length" class="zb-tree-empty mt-1.5 rounded-xxs border-slim border-dashed border-zaux-light-grey px-1 py-2 text-[10px] text-zaux-dark-grey" @dragover.prevent @drop.stop.prevent="drop($event, null)">{{ translate('zx_builder_empty_tree') }}</li>
  </ul>
</template>
<script>
import { defineComponent } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { containers } from '../../services/catalog.js';
import BuilderButton from './BuilderButton.vue';
export default defineComponent({
  name: 'BuilderTree', components: { BuilderButton }, props: { nodes: Array, instance: String, depth: { default: 0 } },
  setup(props) {
    const builder = useBuilder();
    function startDrag(event, id) { event.dataTransfer.setData('application/x-zaux-builder', JSON.stringify({ kind: 'node', id, instanceId: props.instance })); event.dataTransfer.effectAllowed = 'move'; }
    function drop(event, node) {
      try { const payload = JSON.parse(event.dataTransfer.getData('application/x-zaux-builder')); builder.dropElement(payload, node?.id, node && event.shiftKey && containers.includes(node.name) ? 'inside' : 'after', props.instance); } catch { /* Ignore external drags. */ }
    }
    function duplicateHere(id) { builder.selectInstance(props.instance, id); builder.duplicateNode(); }
    function deleteHere(id) { builder.selectInstance(props.instance, id); builder.deleteNode(); }
    return { ...builder, startDrag, drop, duplicateHere, deleteHere };
  }
});
</script>
