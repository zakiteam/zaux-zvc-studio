<template>
  <PreviewBoundary :key="renderKey" :message="message" @error="$emit('error', $event)">
    <ComponentsRenderer :components="nodes" />
  </PreviewBoundary>
</template>

<script>
import { computed, defineComponent } from 'vue';
import { previewNodes } from '../../services/preview.js';
import ComponentsRenderer from '../../../integrations/zaux/renderers/slot-renderer.js';

export default defineComponent({
  components: { ComponentsRenderer },
  props: { instance: Object, editable: Boolean, uiSettings: Object, message: String },
  emits: ['error'],
  setup(props) {
    // Overlay movement must not rebuild, sanitize or patch the rendered Zaux tree.
    const nodes = computed(() => previewNodes(props.instance, props.editable));
    const renderKey = computed(() => JSON.stringify([props.instance, props.uiSettings]));
    return { nodes, renderKey };
  }
});
</script>
