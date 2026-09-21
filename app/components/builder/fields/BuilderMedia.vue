<template>
  <fieldset :disabled="!canEditRemote || remoteProjectBusy" class="grid min-w-0 gap-2 mb-3 border-none p-0">
    <BuilderMediaInput :modelValue="node.props" :label="translate('zx_builder_media')" @update:modelValue="commit" />
  </fieldset>
</template>

<script>
import { defineComponent } from 'vue';
import { useBuilder } from '../../../composables/useBuilder.js';
import { useTranslation } from '../../../composables/useTranslation.js';
import BuilderMediaInput from './BuilderMediaInput.vue';

export default defineComponent({
  name: 'BuilderMedia',
  components: { BuilderMediaInput },
  props: { node: Object },
  setup(props) {
    const builder = useBuilder();
    function commit(value) {
      if (!builder.canEditRemote.value || builder.remoteProjectBusy.value) return;
      builder.updateNode({ ...value });
    }
    return { ...builder, ...useTranslation(), commit };
  }
});
</script>
