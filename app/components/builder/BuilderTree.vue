<template>
  <ul class="zb-tree my-0.5 list-none p-0 [&.zb-tree--nested]:ml-1 [&.zb-tree--nested]:border-l-slim [&.zb-tree--nested]:border-zaux-light-grey [&.zb-tree--nested]:pl-0.75" :class="{ 'zb-tree--nested': depth || nested }">
    <li v-for="node in nodes" :key="node.id" class="relative" :data-zb-outline-node="node.id">
      <BuilderDropdown
        :context-menu="true"
        content-class="!w-max !max-w-max !pb-1"
        :label="translate('zx_builder_layer_actions') + ': ' + node.name"
        :items="contextItems"
        :disabled="!canWrap"
        @contextmenu="selectOutlineRow(instance, node.id, false, true)"
        @select="contextAction($event, node.id)"
      >
        <template #trigger="{ open, menuId }">
          <div
            class="zb-tree-item group/row flex min-w-0 items-center gap-0.25 rounded-xxs hover:bg-zaux-light focus-within:bg-zaux-light [&.active]:bg-zaux-accent/10"
            :class="{ active: outlineSelected(instance, node.id), 'outline outline-1 outline-zaux-accent bg-zaux-accent/10': outlineDrag.position(node.id, instance) === 'inside' }"
            data-zb-outline-drop="node" :data-zb-drop-instance="instance" :data-zb-drop-node="node.id"
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
              class="zb-tree-row select-none flex min-w-0 flex-1 items-center gap-1 rounded-xxs px-0.5 py-0.5 text-left !text-[11px] [&>span]:truncate [&>small]:ml-auto [&>small]:text-[9px] [&>small]:text-zaux-dark-grey [&.active]:text-zaux-accent"
              :class="{ active: outlineSelected(instance, node.id) }"
              :draggable="canEditRemote"
              :aria-haspopup="canWrap ? 'menu' : undefined"
              :aria-expanded="canWrap ? open : undefined"
              :aria-controls="canWrap ? menuId : undefined"
              :aria-pressed="outlineSelected(instance, node.id)"
              @mousedown.shift.prevent
              @click="revealNode(node.id, $event)"
              @dragstart.stop="outlineDrag.start($event, { kind: 'node', id: node.id, instanceId: instance })"
            ><span>{{ node.name }}</span>
              <span v-if="hiddenOutlineNodes.has(JSON.stringify([instance, node.id]))"
                class="inline-flex shrink-0 text-zaux-dark-grey" role="img"
                :title="translate('zx_builder_outline_hidden_viewport') + ': ' + viewportLabel"
                :aria-label="translate('zx_builder_outline_hidden_viewport') + ': ' + viewportLabel">
                <Icon iconName="visibility-off" size="text-icon-xxs" aria-hidden="true" />
              </span>
              <small v-if="node.children.length">{{ node.children.length }}</small></button>
            <div class="zb-tree-actions flex shrink-0 items-center gap-[1px] opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 [&>.zb-button]:!min-w-[24px] [&>.zb-button]:!w-[24px] [&>.zb-button]:!p-0.5" :class="{ '!opacity-100': outlineSelected(instance, node.id) }">
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
      data-zb-outline-drop="empty" :data-zb-drop-instance="instance"
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
    name: 'BuilderTree', components: { BuilderButton, BuilderDropdown }, props: { nodes: Array, instance: String, depth: { default: 0 }, nested: Boolean },
    setup(props) {
      const builder = useBuilder();
      const outlineDrag = useBuilderOutlineDrag();
      const canWrap = computed(() => {
        const definition = builder.mode.value === 'library'
          ? builder.activeDefinition.value
          : builder.activeTemplate.value?.instances.find(item => item.id === props.instance)?.definition;
        return builder.canEditRemote.value && !!definition && !definition.sourceKey;
      });
      const contextItems = computed(() => [
        { id: 'wrap', label: builder.translate('zx_builder_wrap_div') },
        { id: 'group-zvc', label: builder.translate('zx_builder_group_zvc'), disabled: builder.outlineSelection.value.length > 1 && !builder.outlineGroupRange.value, hidden: builder.mode.value !== 'template' || props.depth !== 0 || builder.activeTemplate.value?.instances.find(item => item.id === props.instance)?.kind !== 'free' }
      ]);
      function contextAction(action, id) {
        if (action.id === 'wrap') { builder.selectInstance(props.instance, id); builder.wrapNode(); }
        if (action.id === 'group-zvc') builder.openOutlineGroup(props.instance, id);
      }
      function duplicateHere(id) { builder.selectInstance(props.instance, id); builder.duplicateNode(); }
      function deleteHere(id) { builder.selectInstance(props.instance, id); builder.deleteNode(); }
      function revealNode(id, event) { builder.selectOutlineRow(props.instance, id, event.shiftKey); if (!event.shiftKey) builder.reveal(props.instance, id); }
      return { ...builder, outlineDrag, canWrap, contextItems, contextAction, duplicateHere, deleteHere, revealNode };
    }
  });
  
</script>
