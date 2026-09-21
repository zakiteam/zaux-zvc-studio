<template>
  <fieldset :disabled="!canEditRemote || remoteProjectBusy" class="grid min-w-0 gap-3 mb-3">
    <p class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_lightbox_trigger_hint') }}</p>

    <BuilderInput
      type="select"
      :modelValue="lightboxId"
      :label="translate('zx_builder_lightbox_target')"
      :options="lightboxOptions"
      @update:modelValue="setLightboxId"
    />

    <BuilderInput
      type="select"
      :modelValue="mode"
      :label="translate('zx_builder_lightbox_mode')"
      :options="modeOptions"
      @update:modelValue="setMode"
    />

    <BuilderInput
      v-if="mode === 'index'"
      type="number"
      :min="0"
      :step="1"
      :modelValue="indexValue"
      :label="translate('zx_builder_lightbox_index')"
      @update:modelValue="setIndex"
    />

    <div>
      <BuilderButton size="xs" variant="light" icon="delete" :label="translate('zx_builder_lightbox_remove')" @click="removeTrigger" />
    </div>
  </fieldset>
</template>
<script>
import { defineComponent, computed } from 'vue';
import { useBuilder } from '../../../../composables/useBuilder.js';
import { LIGHTBOX_ID_ATTR, LIGHTBOX_INDEX_ATTR, TRIGGER_ATTR, lightboxIndex } from '../../../../../integrations/zaux/controls/lightbox-controls.js';
import BuilderInput from '../BuilderInput.vue';
import BuilderButton from '../../BuilderButton.vue';

export default defineComponent({
  components: { BuilderInput, BuilderButton },
  props: { node: Object },
  setup(props) {
    const builder = useBuilder();
    const trees = computed(() => builder.mode.value === 'library'
      ? [builder.activeDefinition.value?.tree ?? []]
      : (builder.activeTemplate.value?.instances ?? []).map(instance => instance.definition.tree));

    const lightboxId = computed(() => typeof props.node.props[LIGHTBOX_ID_ATTR] === 'string' ? props.node.props[LIGHTBOX_ID_ATTR] : '');
    const mode = computed(() => (lightboxIndex(props.node) === null ? 'trigger' : 'index'));
    const indexValue = computed(() => lightboxIndex(props.node) ?? '0');
    const modeOptions = computed(() => [
      { value: 'trigger', label: builder.translate('zx_builder_lightbox_mode_trigger') },
      { value: 'index', label: builder.translate('zx_builder_lightbox_mode_index') }
    ]);

    function collectIds(nodes, out) {
      for (const node of nodes) {
        if (node.name === 'ZLightbox' && typeof node.props?.id === 'string' && node.props.id) {
          out.set(node.props.id, { value: node.props.id, label: node.props.id });
        }
        collectIds(node.children ?? [], out);
      }
    }
    const lightboxOptions = computed(() => {
      const found = new Map();
      trees.value.forEach(tree => collectIds(tree, found));
      const options = [...found.values()];
      const current = lightboxId.value;
      if (current && !found.has(current)) options.push({ value: current, label: current });
      if (!options.length) options.push({ value: '', label: builder.translate('zx_builder_lightbox_none') });
      return options;
    });

    function update(props) {
      if (!builder.canEditRemote.value || builder.remoteProjectBusy.value) return;
      builder.updateNode(props);
    }
    function setLightboxId(value) {
      update({ ...props.node.props, [LIGHTBOX_ID_ATTR]: typeof value === 'string' ? value : '' });
    }
    function setMode(value) {
      const next = { ...props.node.props };
      if (value === 'index') {
        if (lightboxIndex(props.node) === null) next[LIGHTBOX_INDEX_ATTR] = '0';
      } else {
        delete next[LIGHTBOX_INDEX_ATTR];
      }
      update(next);
    }
    function setIndex(value) {
      const next = { ...props.node.props, [LIGHTBOX_INDEX_ATTR]: String(value ?? '') };
      update(next);
    }
    function removeTrigger() {
      const next = { ...props.node.props };
      delete next[TRIGGER_ATTR];
      delete next[LIGHTBOX_ID_ATTR];
      delete next[LIGHTBOX_INDEX_ATTR];
      update(next);
    }

    return { ...builder, lightboxId, mode, indexValue, modeOptions, lightboxOptions, setLightboxId, setMode, setIndex, removeTrigger };
  }
});
</script>
