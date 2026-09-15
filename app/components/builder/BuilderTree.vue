<template>
  <ul class="zb-tree my-0.5 list-none p-0 [&.zb-tree--nested]:ml-1 [&.zb-tree--nested]:border-l-slim [&.zb-tree--nested]:border-zaux-light-grey [&.zb-tree--nested]:pl-0.75" :class="{ 'zb-tree--nested': depth }">
    <li v-for="node in nodes" :key="node.id" class="relative">
      <BuilderDropdown
        :context-menu="true"
        content-class="!w-max !max-w-max !pb-1"
        :label="translate('zx_builder_layer_actions') + ': ' + node.name"
        :items="[{ id: 'wrap', label: translate('zx_builder_wrap_div') }]"
        :disabled="!canWrap"
        @contextmenu="selectInstance(instance, node.id)"
        @select="wrapHere(node.id)"
      >
        <template #trigger="{ open, menuId }">
          <div
            class="zb-tree-item flex min-w-0 items-center gap-0.25 rounded-xxs hover:bg-zaux-light focus-within:bg-zaux-light [&.active]:bg-zaux-accent/5"
            :class="{ active: nodeId === node.id && (mode === 'library' || instanceId === instance), 'outline outline-1 outline-zaux-accent bg-zaux-accent/10': outlineDrag.position(node.id, instance) === 'inside' }"
            @dragover="outlineDrag.over($event, node, instance)"
            @dragleave="outlineDrag.leave"
            @drop="outlineDrag.drop($event, node, instance)"
          >
            <button
              v-if="node.children.length"
              type="button"
              class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[10px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
              :aria-expanded="!collapsedOutline.has('node:' + instance + ':' + node.id)"
              :aria-label="translate(collapsedOutline.has('node:' + instance + ':' + node.id) ? 'zx_builder_expand' : 'zx_builder_collapse') + ': ' + node.name"
              @click.stop="toggleOutline('node:' + instance + ':' + node.id)"
              @dragstart.stop.prevent
            ><span aria-hidden="true">{{ collapsedOutline.has('node:' + instance + ':' + node.id) ? '▸' : '▾' }}</span></button>
            <span v-else aria-hidden="true" class="w-[24px] shrink-0 text-center text-[10px] text-zaux-dark-grey">&#9671;</span>
            <button
              class="zb-tree-row flex min-w-0 flex-1 items-center gap-1 rounded-xxs px-0.5 py-1 text-left !text-[10px] [&>span]:truncate [&>small]:ml-auto [&>small]:text-[9px] [&>small]:text-zaux-dark-grey [&.active]:text-zaux-accent"
              :class="{ active: nodeId === node.id && (mode === 'library' || instanceId === instance) }"
              :draggable="canEditRemote"
              :aria-haspopup="canWrap ? 'menu' : undefined"
              :aria-expanded="canWrap ? open : undefined"
              :aria-controls="canWrap ? menuId : undefined"
              @click="selectInstance(instance, node.id)"
              @dragstart.stop="outlineDrag.start($event, { kind: 'node', id: node.id, instanceId: instance })"
            ><span>{{ node.name }}</span><small v-if="node.children.length">{{ node.children.length }}</small></button>
            <div class="zb-tree-actions flex shrink-0 items-center gap-[1px] [&>.zb-button]:!min-w-[25px] [&>.zb-button]:!w-[25px] [&>.zb-button]:!p-0.5">
              <BuilderButton variant="alt1" icon="duplicate" iconOnly :label="translate('zx_builder_duplicate') + ': ' + node.name" @click.stop="duplicateHere(node.id)" />
              <BuilderButton variant="alt1" icon="delete" iconOnly :label="translate('zx_builder_delete') + ': ' + node.name" @click.stop="deleteHere(node.id)" />
            </div>
          </div>
        </template>
      </BuilderDropdown>
      <BuilderTree v-if="node.children.length && !collapsedOutline.has('node:' + instance + ':' + node.id)" :nodes="node.children" :instance="instance" :depth="depth + 1" />
      <span
        v-if="outlineDrag.position(node.id, instance)"
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-zaux-accent"
        :class="outlineDrag.position(node.id, instance) === 'before' ? 'top-0' : 'bottom-0'"
        :style="outlineDrag.position(node.id, instance) === 'inside' ? { left: '20px' } : null"
      />
    </li>
    <li
      v-if="!nodes.length"
      class="zb-tree-empty relative mt-1.5 rounded-xxs border-slim border-dashed border-zaux-light-grey px-1 py-2 text-[10px] text-zaux-dark-grey"
      :class="{ '!border-zaux-accent bg-zaux-accent/10': outlineDrag.position(null, instance) }"
      @dragover="outlineDrag.over($event, null, instance)"
      @dragleave="outlineDrag.leave"
      @drop="outlineDrag.drop($event, null, instance)"
    >{{ translate('zx_builder_empty_tree') }}
      <span v-if="outlineDrag.position(null, instance)" aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-zaux-accent" />
    </li>
  </ul>
</template>

<script>
  import { computed, defineComponent } from 'vue';
  import { useBuilder } from '../../composables/useBuilder.js';
  import { useBuilderOutlineDrag } from '../../composables/useBuilderOutlineDrag.js';
  import BuilderButton from './BuilderButton.vue';
  import BuilderDropdown from './BuilderDropdown.vue';

  export default defineComponent({
    name: 'BuilderTree', components: { BuilderButton, BuilderDropdown }, props: { nodes: Array, instance: String, depth: { default: 0 } },
    setup(props) {
      const builder = useBuilder();
      const outlineDrag = useBuilderOutlineDrag();
      const canWrap = computed(() => {
        const definition = builder.mode.value === 'library'
          ? builder.activeDefinition.value
          : builder.activeTemplate.value?.instances.find(item => item.id === props.instance)?.definition;
        return builder.canEditRemote.value && !!definition && !definition.sourceKey;
      });
      function wrapHere(id) { builder.selectInstance(props.instance, id); builder.wrapNode(); }
      function duplicateHere(id) { builder.selectInstance(props.instance, id); builder.duplicateNode(); }
      function deleteHere(id) { builder.selectInstance(props.instance, id); builder.deleteNode(); }
      return { ...builder, outlineDrag, canWrap, wrapHere, duplicateHere, deleteHere };
    }
  });
  
</script>
