<template>
  <div v-if="thumbnailBatch.total || failures.length" class="mt-1.5 text-[10px]">
    <p v-if="thumbnailBatch.total" role="status" class="mt-1 text-zaux-dark-grey">
      {{ translate(thumbnailBatch.running ? 'zx_builder_thumbnails_progress' : 'zx_builder_thumbnails_done') }}
      {{ thumbnailBatch.done }} / {{ thumbnailBatch.total }}
    </p>
    <details v-if="failures.length" class="mt-1 text-utility-error">
      <summary class="cursor-pointer">{{ translate('zx_builder_thumbnails_failures') }}: {{ failures.length }}</summary>
      <ul class="max-h-[150px] overflow-auto">
        <li v-for="item in failures" :key="item.id" class="mt-1 break-words"><strong>{{ item.name }}</strong>: {{ item.error }}</li>
      </ul>
    </details>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';

export default defineComponent({
  setup() {
    const builder = useBuilder();
    const failures = computed(() => builder.document.value.library
      .filter(item => !item.previewImage && builder.libraryThumbnails.value[item.id]?.status === 'error')
      .map(item => ({ id: item.id, name: item.name, error: builder.libraryThumbnails.value[item.id].error })));
    return { failures, translate: builder.translate, thumbnailBatch: builder.thumbnailBatch };
  },
});
</script>
