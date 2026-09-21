<template>
  <fieldset :disabled="!canEditRemote || remoteProjectBusy" class="grid min-w-0 gap-3 mb-3">
    <div>
      <label class="mb-0.5 block text-[11px]" :for="`${id}-lightbox-id`">{{ translate('zx_builder_lightbox_id') }}</label>
      <BuilderInput :id="`${id}-lightbox-id`" type="text" :modelValue="node.props.id ?? ''" :label="translate('zx_builder_lightbox_id')" @update:modelValue="setProp('id', $event)" />
    </div>

    <BuilderLightboxItems v-if="Array.isArray(node.props.items)" :modelValue="node.props.items" @update:modelValue="setProp('items', $event)" />
    <p v-else class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_lightbox_items_bound') }}</p>

    <details>
      <summary>{{ translate('zx_builder_lightbox_options') }}</summary>
      <BuilderValue type="json" :modelValue="node.props.options ?? {}" :label="translate('zx_builder_lightbox_options')" @update:modelValue="setProp('options', $event)" />
    </details>
  </fieldset>
</template>
<script>
import { defineComponent, useId } from 'vue';
import { useBuilder } from '../../../../composables/useBuilder.js';
import BuilderInput from '../BuilderInput.vue';
import BuilderValue from '../BuilderValue.vue';
import BuilderLightboxItems from './BuilderLightboxItems.vue';

export default defineComponent({
  components: { BuilderInput, BuilderValue, BuilderLightboxItems },
  props: { node: Object },
  setup(props) {
    const builder = useBuilder();
    function setProp(key, value) {
      if (!builder.canEditRemote.value || builder.remoteProjectBusy.value) return;
      builder.updateNode({ ...props.node.props, [key]: value });
    }
    return { ...builder, id: useId(), setProp };
  }
});
</script>
