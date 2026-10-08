<template>
	<Teleport to="body">
		<div
			role="tooltip"
			class="pointer-events-none fixed z-[1000] flex w-[300px] flex-col gap-0.5 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-1 font-builder shadow-lg"
			:style="{ left: `${left}px`, top: `${top}px` }"
		>
			<div class="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-light/40">
				<img v-if="image" :src="image" alt="" class="h-full w-full" :class="definition?.previewImage ? 'object-cover' : 'object-contain object-top'" />
				<span v-else class="px-2 text-center text-[11px] text-zaux-dark-grey" :title="entry?.error">
					{{ translate(entry?.status === 'error' ? 'zx_builder_thumbnail_error' : 'zx_builder_thumbnail_loading') }}
				</span>
			</div>
			<p class="truncate px-0.25 text-[11px] font-semibold">{{ name }}</p>
		</div>
	</Teleport>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, watch } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";

const HEIGHT = 260;

// Hover/focus preview for an Elements panel entry: the cached Library-style capture, placed beside the sidebar.
export default defineComponent({
	props: {
		previewId: { type: String, required: true },
		name: { type: String, default: "" },
		// Viewport coordinates: the hovered row (top/bottom) and the sidebar right edge (left).
		anchor: { type: Object, required: true },
	},
	setup(props) {
		const builder = useBuilder();
		const definition = computed(() => builder.document.value.library.find((item) => item.id === props.previewId) ?? null);
		const entry = computed(() => builder.libraryThumbnails.value[props.previewId]);
		const image = computed(() => definition.value?.previewImage || entry.value?.url || "");
		const left = computed(() => props.anchor.left + 8);
		const top = computed(() => {
			const center = (props.anchor.top + props.anchor.bottom) / 2 - HEIGHT / 2;
			return Math.max(8, Math.min(center, window.innerHeight - HEIGHT - 8));
		});
		// Render a missing capture only once the pointer rests on the entry.
		let timer;
		watch(() => props.previewId, (id) => {
			clearTimeout(timer);
			if (!definition.value?.previewImage) timer = setTimeout(() => builder.ensureLibraryThumbnail(id), 250);
		}, { immediate: true });
		onBeforeUnmount(() => clearTimeout(timer));
		return { definition, entry, image, left, top, translate: builder.translate };
	},
});
</script>
