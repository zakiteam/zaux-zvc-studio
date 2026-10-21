<template>
	<section class="zb-inspector-section border-t-slim border-zaux-light-grey" :data-zb-section="id">
		<div class="flex items-center gap-1">
			<h3 class="m-0 min-w-0 flex-1">
				<button
					type="button"
					class="flex w-full min-w-0 items-center gap-1 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zaux-dark-grey hover:text-zaux-dark"
					:aria-expanded="isOpen"
					:aria-controls="bodyId"
					@click="toggle"
				>
					<svg class="h-[10px] w-[10px] shrink-0 transition-transform" :class="isOpen ? '' : '-rotate-90'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'dropdown-bottom')" /></svg>
					<span class="truncate">{{ title }}</span>
					<span
						v-if="count"
						class="shrink-0 rounded-xxs px-0.75 text-[9px] font-semibold normal-case tracking-normal"
						:class="accent ? 'bg-zaux-accent/15 text-zaux-accent' : 'bg-zaux-light text-zaux-dark-grey'"
					>{{ count }}</span>
				</button>
			</h3>
			<slot name="actions" />
		</div>
		<div v-show="isOpen" :id="bodyId" class="pb-2">
			<slot />
		</div>
	</section>
</template>
<script>
	import { computed, defineComponent, useId } from "vue";
	import { useBuilder } from "../../../composables/useBuilder.js";
	import { useInspectorSections } from "../../../composables/useInspectorSections.js";
	import { iconHref } from "@integration/options/icon-options.js";

	// Collapsible group of the Inspector Properties tab.
	export default defineComponent({
		name: "BuilderInspectorSection",
		props: {
			id: { type: String, required: true },
			title: { type: String, required: true },
			count: { type: Number, default: 0 },
			// Highlights the count (for example authored attributes or filled slots).
			accent: Boolean,
			defaultOpen: { type: Boolean, default: true },
			// Forces the section open without changing the remembered state (search results).
			forceOpen: Boolean,
		},
		setup(props) {
			const bodyId = useId();
			const { isSectionOpen, setSectionOpen } = useInspectorSections();
			const isOpen = computed(() => props.forceOpen || isSectionOpen(props.id, props.defaultOpen));
			function toggle() {
				setSectionOpen(props.id, !isOpen.value);
			}
			return { bodyId, isOpen, toggle, iconHref, iconSet: useBuilder()?.iconSet };
		},
	});
</script>
