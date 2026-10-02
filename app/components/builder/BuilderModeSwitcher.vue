<template>
	<div class="zb-mode-switcher flex shrink-0 items-center gap-1">
		<span
			v-if="showActiveLabel && activeItem"
			class="zb-eyebrow truncate text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
			>{{ translate(activeItem.label) }}</span
		>
		<div
			class="flex shrink-0 gap-0.5 rounded-xxs bg-zaux-light p-[2px]"
			role="group"
			:aria-label="translate('zx_builder_mode_switcher')"
		>
			<BuilderButton
				v-for="item in items"
				:key="item.id"
				size="xs"
				:icon="item.icon"
				:iconOnly="!showLabels"
				:label="translate(item.label)"
				:variant="item.id === activeMode ? 'primary' : 'secondary'"
				:aria-pressed="item.id === activeMode"
				@click="activate(item)"
			/>
		</div>
	</div>
</template>
<script>
import { defineComponent, computed } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import BuilderButton from "./BuilderButton.vue";

// Built-in modes: plain shortcuts over the existing workspace state.
const MODES = {
	design: { icon: "selection", label: "zx_builder_design_mode" },
	tokens: { icon: "customize", label: "zx_builder_style_settings" },
	themes: { icon: "interface", label: "zx_builder_theme_editor" },
};

export default defineComponent({
	components: { BuilderButton },
	props: {
		// Mode ids, or objects overriding a built-in mode: { id, icon?, label? }.
		modes: { type: Array, default: () => ["design", "tokens", "themes"] },
		showLabels: { type: Boolean, default: false },
		showActiveLabel: { type: Boolean, default: false },
	},
	emits: ["change"],
	setup(props, { emit }) {
		const builder = useBuilder();
		const items = computed(() =>
			props.modes
				.map((mode) => (typeof mode === "string" ? { id: mode } : mode))
				.filter((mode) => MODES[mode.id])
				.map((mode) => ({ ...MODES[mode.id], ...mode })),
		);
		const activeMode = computed(() => {
			if (builder.workspaceView.value === "themes") return "themes";
			return builder.stylesOpen.value ? "tokens" : "design";
		});
		const activeItem = computed(() =>
			items.value.find((item) => item.id === activeMode.value),
		);
		function activate(item) {
			builder.stylesOpen.value = item.id === "tokens";
			builder.workspaceView.value = item.id === "themes" ? "themes" : "design";
			if (item.id === "tokens") builder.previewOnly.value = false;
			emit("change", item.id);
		}
		return {
			translate: builder.translate,
			items,
			activeMode,
			activeItem,
			activate,
		};
	},
});
</script>
