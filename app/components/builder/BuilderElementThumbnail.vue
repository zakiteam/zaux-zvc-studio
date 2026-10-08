<template>
	<span ref="root" class="grid h-[72px] w-full place-items-center overflow-hidden rounded-xxs bg-zaux-light" aria-hidden="true">
		<img v-if="image" draggable="false" :src="image" alt="" loading="lazy" class="h-full w-full" :class="definition?.previewImage ? 'object-cover' : 'object-contain object-top'" />
		<span v-else :title="entry?.error" class="px-1 text-center text-[9px] leading-tight text-zaux-dark-grey">
			{{ translate(entry?.status === 'error' ? 'zx_builder_thumbnail_error' : 'zx_builder_thumbnail_loading') }}
		</span>
	</span>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";

// Inline capture for an Elements panel card (Zaux component or ZVP), requested lazily while the card is in view.
export default defineComponent({
	props: { previewId: { type: String, required: true } },
	setup(props) {
		const builder = useBuilder();
		const root = ref(null);
		const visible = ref(false);
		const definition = computed(() => builder.document.value.library.find((item) => item.id === props.previewId) ?? null);
		const entry = computed(() => builder.libraryThumbnails.value[props.previewId]);
		const image = computed(() => definition.value?.previewImage || entry.value?.url || "");
		const source = computed(() => visible.value && !definition.value?.previewImage && builder.workspaceReady.value
			? JSON.stringify([builder.document.value.id, props.previewId]) : "");
		let observer;
		let timer;
		watch(source, (value) => {
			clearTimeout(timer);
			if (value) timer = setTimeout(() => builder.ensureLibraryThumbnail(props.previewId), 600);
		}, { immediate: true });
		onMounted(() => {
			observer = new IntersectionObserver((entries) => { visible.value = entries[0].isIntersecting; }, { rootMargin: "120px" });
			observer.observe(root.value);
		});
		onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(timer); });
		return { root, definition, entry, image, translate: builder.translate };
	},
});
</script>
