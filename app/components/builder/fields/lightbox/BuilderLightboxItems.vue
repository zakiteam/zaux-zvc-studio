<template>
  <section class="grid gap-2">
    <div class="flex items-center justify-between">
      <p class="text-[12px] font-medium">{{ translate('zx_builder_lightbox_items') }} ({{ items.length }})</p>
      <BuilderButton size="xs" icon="add" :label="translate('zx_builder_lightbox_add')" @click="add" />
    </div>

    <div
      v-for="(item, index) in items"
      :key="index"
      class="flex flex-col gap-1 rounded-xxs border-slim border-zaux-light p-2"
    >
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[10px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          :aria-expanded="!collapsed.has(index)"
          :aria-label="translate(collapsed.has(index) ? 'zx_builder_expand' : 'zx_builder_collapse')"
          @click="toggleCollapse(index)"
        >
          <span aria-hidden="true">{{ collapsed.has(index) ? "▸" : "▾" }}</span>
        </button>
        <span class="min-w-0 flex-1 truncate text-[11px] font-medium">{{ index + 1 }} · {{ item['data-img'] || item.href || translate('zx_builder_lightbox_item') }}</span>
        <div class="flex shrink-0 gap-0.5">
          <BuilderButton size="xs" variant="secondary" icon="chevron-up" iconOnly :label="translate('zx_builder_move_up')" :disabled="index === 0" @click="move(index, -1)" />
          <BuilderButton size="xs" variant="secondary" icon="chevron-down" iconOnly :label="translate('zx_builder_move_down')" :disabled="index === items.length - 1" @click="move(index, 1)" />
          <BuilderButton size="xs" variant="secondary" icon="duplicate" iconOnly :label="translate('zx_builder_duplicate')" @click="duplicate(index)" />
          <BuilderButton size="xs" variant="secondary" icon="delete" iconOnly :label="translate('zx_builder_delete')" @click="remove(index)" />
        </div>
      </div>

      <template v-if="!collapsed.has(index)">
        <BuilderImageInput :modelValue="item['data-img'] ?? ''" :label="translate('zx_builder_lightbox_image')" @update:modelValue="setField(index, 'data-img', $event)" />
        <BuilderImageInput :modelValue="item.href ?? ''" :label="translate('zx_builder_lightbox_href')" @update:modelValue="setField(index, 'href', $event)" />
        <BuilderInput type="text" :modelValue="item['data-caption'] ?? ''" :label="translate('zx_builder_lightbox_caption')" @update:modelValue="setField(index, 'data-caption', $event)" />
        <BuilderInput type="text" :modelValue="item['data-alt'] ?? ''" :label="translate('zx_builder_lightbox_alt')" @update:modelValue="setField(index, 'data-alt', $event)" />
      </template>
    </div>

    <details>
      <summary>{{ translate('zx_builder_advanced') }}</summary>
      <BuilderValue type="json" :modelValue="items" :label="translate('zx_builder_lightbox_items')" @update:modelValue="replaceAll" />
    </details>
  </section>
</template>
<script>
import { defineComponent, ref, watch } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import { clone } from '../../../../../domain/nodes.js';
import { defaultLightboxItem } from '../../../../../integrations/zaux/controls/lightbox-controls.js';
import BuilderButton from '../../BuilderButton.vue';
import BuilderInput from '../BuilderInput.vue';
import BuilderImageInput from '../BuilderImageInput.vue';
import BuilderValue from '../BuilderValue.vue';

export default defineComponent({
  components: { BuilderButton, BuilderInput, BuilderImageInput, BuilderValue },
  props: { modelValue: Array },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const items = ref([]);
    const collapsed = ref(new Set());

    watch(
      () => props.modelValue,
      value => {
        const incoming = (Array.isArray(value) ? value : []).map(item => ({ ...item }));
        if (JSON.stringify(incoming) !== JSON.stringify(items.value)) items.value = incoming;
      },
      { immediate: true, deep: true }
    );

    function commit(list) {
      items.value = list;
      emit('update:modelValue', clone(list));
    }
    function add() {
      commit([...items.value, defaultLightboxItem()]);
    }
    function remove(index) {
      commit(items.value.filter((_, position) => position !== index));
    }
    function duplicate(index) {
      const source = items.value[index];
      if (!source) return;
      const list = clone(items.value);
      list.splice(index + 1, 0, clone(source));
      commit(list);
    }
    function move(index, delta) {
      const target = index + delta;
      if (target < 0 || target >= items.value.length) return;
      const list = clone(items.value);
      [list[index], list[target]] = [list[target], list[index]];
      commit(list);
    }
    function setField(index, key, value) {
      commit(items.value.map((item, position) => position === index ? { ...item, [key]: value } : item));
    }
    function replaceAll(value) {
      if (Array.isArray(value)) commit(value);
    }
    function toggleCollapse(index) {
      if (collapsed.value.has(index)) collapsed.value.delete(index);
      else collapsed.value.add(index);
    }

    return {
      translate,
      items,
      collapsed,
      add,
      remove,
      duplicate,
      move,
      setField,
      replaceAll,
      toggleCollapse
    };
  }
});
</script>
