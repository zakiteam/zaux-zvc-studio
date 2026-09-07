<template>
  <div class="zb-context-card zb-source-info mt-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2 [&_p]:mb-1.5 [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-zaux-dark-grey !mt-0 [&>code]:block [&>code]:break-all [&>code]:py-1 [&>code]:text-[10px] [&>code]:text-zaux-dark-grey">
    <span class="zb-badge inline-block rounded-xxs bg-zaux-light px-0.75 py-0.25 font-mono text-[10px] tracking-[0.8px] text-zaux-dark-grey">{{ translate('zx_builder_from_code') }}</span>
    <p>{{ translate(isSourceBase ? 'zx_builder_source_base_notice' : 'zx_builder_source_notice') }}</p>
    <code>app/zvc/{{ activeDefinition.sourceKey }}</code>
    <p v-if="!hasSource" class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error">{{ translate('zx_builder_source_missing') }}</p>
    <div class="zb-source-actions flex flex-col items-start gap-1">
      <BuilderButton v-if="isSourceBase" icon="duplicate" :label="translate('zx_builder_configure_copy')" @click="duplicate('library', activeDefinition.id)" />
      <BuilderButton icon="edit" :label="translate('zx_builder_convert_visual')" @click="convertToVisual" />
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderButton from './BuilderButton.vue';
export default defineComponent({
  components: { BuilderButton },
  setup() { return useBuilder(); }
});
</script>
