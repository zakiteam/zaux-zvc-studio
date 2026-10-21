<template>
  <section class="grid gap-2">
    <div class="flex items-center justify-between">
      <p class="text-[12px] font-medium">{{ translate('zx_builder_lightbox_items') }} ({{ items.length }})</p>
      <BuilderButton size="xs" icon="add" :label="translate('zx_builder_lightbox_add')" @click="add" />
    </div>

    <BuilderSortableList
      :items="items"
      :label="translate('zx_builder_lightbox_items')"
      collapsible
      card
      :itemLabel="(item, index) => `${index + 1} · ${item['data-img'] || item.href || translate('zx_builder_lightbox_item')}`"
      @change="commit"
    >
      <template #body="{ item, index }">
        <BuilderImageInput :modelValue="item['data-img'] ?? ''" :label="translate('zx_builder_lightbox_image')" @update:modelValue="setField(index, 'data-img', $event)" />
        <BuilderImageInput :modelValue="item.href ?? ''" :label="translate('zx_builder_lightbox_href')" @update:modelValue="setField(index, 'href', $event)" />
        <BuilderInput type="text" :modelValue="item['data-caption'] ?? ''" :label="translate('zx_builder_lightbox_caption')" @update:modelValue="setField(index, 'data-caption', $event)" />
        <BuilderInput type="text" :modelValue="item['data-alt'] ?? ''" :label="translate('zx_builder_lightbox_alt')" @update:modelValue="setField(index, 'data-alt', $event)" />
      </template>
    </BuilderSortableList>

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

export default defineComponent({
  props: { modelValue: Array },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const items = ref([]);

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
    function setField(index, key, value) {
      commit(items.value.map((item, position) => position === index ? { ...item, [key]: value } : item));
    }
    function replaceAll(value) {
      if (Array.isArray(value)) commit(value);
    }
    return {
      translate,
      items,
      add,
      commit,
      setField,
      replaceAll
    };
  }
});
</script>
