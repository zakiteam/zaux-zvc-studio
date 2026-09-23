<template>
  <div ref="root" class="zb-library-thumb group relative h-[120px] w-full overflow-hidden bg-zaux-light" :aria-busy="!definition.previewImage && entry?.status === 'loading'">
    <button type="button" class="grid w-full h-full place-items-center focus-visible:outline focus-visible:outline-zaux-accent" :aria-label="`${translate('zx_builder_thumbnail_insert')}: ${definition.name}`" @click="$emit('insert')">
      <img v-if="image" :src="image" alt="" loading="lazy" class="w-full h-full" :class="definition.previewImage ? 'object-cover' : 'object-contain object-center'" />
      <span v-else :title="entry?.error" class="px-2 text-center font-builder text-[10px] text-zaux-dark-grey">
        {{ translate(entry?.status === 'error' ? 'zx_builder_thumbnail_error' : 'zx_builder_thumbnail_loading') }}
      </span>
    </button>
    <div class="absolute left-1 top-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" @click.stop @dragstart.stop.prevent>
      <BuilderButton variant="light" icon="media" iconOnly size="xs" :label="translate('zx_builder_media_preview')" :disabled="!canEditRemote" @click.stop="$emit('choose-image')" />
      <BuilderButton v-if="!definition.previewImage" variant="light" icon="refresh" iconOnly size="xs" :label="translate('zx_builder_thumbnail_refresh')" :disabled="entry?.status === 'loading'" @click.stop="refresh" />
    </div>
    <span class="pointer-events-none absolute right-1 top-1 rounded-xxs bg-zaux-white/70 px-0.5 py-0.25 font-mono text-[8px] text-zaux-dark-grey">{{ definition.kind === 'zvp' ? 'ZVP' : definition.sourceKey ? translate('zx_builder_from_code') : 'ZVC' }}</span>
    <span v-if="image && !definition.previewImage && entry?.status === 'error'" role="status" :title="entry?.error" class="pointer-events-none absolute inset-x-0 bottom-0 bg-zaux-white/90 px-1 text-[9px] text-utility-error">{{ translate('zx_builder_thumbnail_error') }}</span>
  </div>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderButton from './BuilderButton.vue';

export default defineComponent({
  components: { BuilderButton },
  props: { definition: { type: Object, required: true } },
  emits: ['insert', 'choose-image'],
  setup(props) {
    const builder = useBuilder();
    const root = ref(null);
    const visible = ref(false);
    const entry = computed(() => builder.libraryThumbnails.value[props.definition.id]);
    const image = computed(() => props.definition.previewImage || entry.value?.url);
    const source = computed(() => visible.value && !props.definition.previewImage && builder.workspaceReady.value
      ? JSON.stringify([builder.document.value.id, props.definition.id]) : '');
    let observer;
    let timer;
    watch(source, value => {
      clearTimeout(timer);
      if (value) timer = setTimeout(() => builder.ensureLibraryThumbnail(props.definition.id), 800);
    }, { immediate: true });
    onMounted(() => {
      observer = new IntersectionObserver(entries => { visible.value = entries[0].isIntersecting; }, { rootMargin: '120px' });
      observer.observe(root.value);
    });
    onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(timer); });
    function refresh() { builder.refreshLibraryThumbnail(props.definition.id); }
    return { root, entry, image, refresh, translate: builder.translate, canEditRemote: builder.canEditRemote };
  },
});
</script>
