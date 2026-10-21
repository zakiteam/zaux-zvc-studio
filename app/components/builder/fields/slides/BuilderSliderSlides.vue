<template>
  <section class="grid gap-2">
    <template v-if="selectedSlide">
      <div class="flex flex-col gap-2 p-3 bg-zaux-light/50 outline outline-zaux-light-grey rounded-xs">
        <BuilderButton class="mb-2" size="s" icon="chevron-left" variant="alt1" :label="translate('zx_builder_slider_back')" @click="selected = null" />
        <p class="text-cta-m font-builder">{{ selected + 1 }} · {{ selectedSlide.name || translate('zx_builder_slider_slide') }}</p>
        <BuilderPartialFields v-if="partial && isPlainRecord(selectedSlide.props)" :key="selected" :definition="partial" :reference="selectedSlide" :bindings="bindings"
          :modelValue="selectedSlide.props" @change="updateProps" />
        <BuilderSliderFields v-else-if="definition && (selectedSlide.props == null || isPlainRecord(selectedSlide.props))" :key="selected" :modelValue="selectedSlide.props ?? {}"
          :fields="definition.fields" @change="updateProps" />
        <p v-else class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_slider_unknown') }}</p>
        <details>
          <summary>{{ translate('zx_builder_advanced') }}</summary>
          <BuilderValue :key="selected" type="json" :modelValue="selectedSlide" :label="translate('zx_builder_slider_slide')" @update:modelValue="updateSlide" />
        </details>
      </div>
    </template>
    <template v-else>
      <p class="text-[12px] font-medium">{{ translate('zx_builder_slider_slides') }} ({{ modelValue.length }})</p>
      <BuilderSortableList :items="modelValue" :label="translate('zx_builder_slider_slides')" openable
        :itemLabel="(slide, index) => `${index + 1} · ${slide?.name || translate('zx_builder_slider_slide')}`"
        @open="selected = $event" @change="commit" />
      <BuilderDropdown :label="translate('zx_builder_slider_add')" :items="contentItems" :filterItems="true" @select="add" />
    </template>
  </section>
</template>
<script>

  import { defineComponent, computed, nextTick, ref, watch } from 'vue';
  import { useBuilder } from '../../../../composables/useBuilder.js';
  import slideComponents from '../../../../data/catalog/slide-components.js';
  import { clone } from '../../../../../domain/nodes.js';
  import { isPlainRecord } from '../../../../../domain/slider.js';
  import { useTranslation } from '../../../../composables/useTranslation.js';
  
  export default defineComponent({
    props: { modelValue: Array }, emits: ['change'],
    setup(props, { emit }) {
      const { translate } = useTranslation();
      const builder = useBuilder();
      const bindings = computed(() => builder.activeDefinition.value?.fields ?? []);
      const partial = computed(() => builder.availablePartials.value.find(item => item.exportName === selectedSlide.value?.name));
      const selected = ref(null);
      const selectedSlide = computed(() => selected.value === null ? null : props.modelValue[selected.value]);
      const definition = computed(() => slideComponents.find(item => item.name === selectedSlide.value?.name));
      const contentItems = computed(() => [...slideComponents.map(item => ({ id: item.name, label: translate(item.label) })), ...builder.selectablePartials.value.map(item => ({ id: item.exportName, label: item.name + ' (ZVP)' }))]);
      watch(() => props.modelValue.length, () => { if (selected.value !== null && selected.value >= props.modelValue.length) selected.value = null; });
      function commit(slides) { emit('change', slides); }
      async function add(item) {
        const partial = builder.availablePartials.value.find(entry => entry.exportName === item.id);
        const entry = partial ? { name: partial.exportName, props: {} } : slideComponents.find(entry => entry.name === item.id);
        if (!entry) return;
        const index = props.modelValue.length;
        commit([...props.modelValue, { type: 'component', name: entry.name, props: clone(entry.props) }]);
        await nextTick();
        if (props.modelValue[index]) selected.value = index;
      }
      function updateSlide(slide) {
        if (!isPlainRecord(slide)) return;
        commit(props.modelValue.map((item, index) => index === selected.value ? slide : item));
      }
      function updateProps(value) { updateSlide({ ...selectedSlide.value, props: value }); }
      return { translate, bindings, partial, selected, selectedSlide, definition, contentItems, isPlainRecord, add, commit, updateSlide, updateProps };
    }
  });
  
</script>
