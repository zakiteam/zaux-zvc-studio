<template>
	<div class="zb-workbench relative flex min-h-0 flex-1 max-[900px]:flex-wrap">
		<div
			v-show="!previewOnly"
			class="group/panel relative flex min-h-0 shrink-0 max-[900px]:h-[80dvh]"
		>
			<BuilderSidebar
				id="zb-sidebar-panel"
				v-show="!sidebarCollapsed"
				:width="leftWidth"
			/>
			<BuilderResizeHandle
				v-if="!sidebarCollapsed"
				class="-mx-[4px]"
				side="left"
				:label="translate('zx_builder_resize_left')"
				@resize="resizePanel('left', $event)"
			/>
			<BuilderButton
				class="absolute left-full top-1/2 z-20 -translate-y-1/2 shadow-sm transition-opacity"
				:class="sidebarCollapsed ? 'opacity-100 ml-1' : '-ml-1 opacity-0 group-hover/panel:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'"
				:icon="sidebarCollapsed ? 'chevron-right' : 'chevron-left'"
				iconOnly
				size="xs"
				:label="translate(sidebarCollapsed ? 'zx_builder_show_sidebar' : 'zx_builder_hide_sidebar') + ' (Ctrl \\)'"
				:aria-expanded="!sidebarCollapsed"
				aria-controls="zb-sidebar-panel"
				@click="sidebarCollapsed = !sidebarCollapsed"
			/>
		</div>
		<main
			class="zb-main flex min-w-0 flex-1 flex-col max-[900px]:h-[80dvh] max-[900px]:w-[calc(100%_-_210px)]"
		>
			<BuilderTemplates v-if="templatesOpen" />
			<BuilderCanvas v-else>
				<template #toolbar><BuilderPreviewControls /></template>
			</BuilderCanvas>
		</main>
		<div
			v-show="!previewOnly"
			class="group/panel relative flex min-h-0 shrink-0"
			:class="inspectorCollapsed && !stylesOpen ? 'max-[900px]:absolute max-[900px]:right-0 max-[900px]:top-0 max-[900px]:h-[80dvh]' : 'max-[900px]:w-full'"
		>
			<BuilderResizeHandle
				v-if="stylesOpen || !inspectorCollapsed"
				class="-mx-[4px]"
				side="right"
				:label="translate('zx_builder_resize_right')"
				@resize="resizePanel('right', $event)"
			/>
			<BuilderStyles
				v-if="stylesOpen && !previewOnly"
				:width="rightWidth"
			/>
			<BuilderInspector
				id="zb-inspector-panel"
				v-show="!stylesOpen && !inspectorCollapsed"
				:width="rightWidth"
			/>
			<BuilderButton
				v-if="!stylesOpen"
				class="absolute right-full top-1/2 z-20 -translate-y-1/2 shadow-sm transition-opacity"
				:class="inspectorCollapsed ? 'opacity-100 mr-1' : '-mr-1 opacity-0 group-hover/panel:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 max-[900px]:right-auto max-[900px]:left-1'"
				:icon="inspectorCollapsed ? 'chevron-left' : 'chevron-right'"
				iconOnly
				size="xs"
				:label="translate(inspectorCollapsed ? 'zx_builder_show_inspector' : 'zx_builder_hide_inspector') + ' (Ctrl \\)'"
				:aria-expanded="!inspectorCollapsed"
				aria-controls="zb-inspector-panel"
				@click="inspectorCollapsed = !inspectorCollapsed"
			/>
		</div>
	</div>
</template>
<script>
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { readLayoutPreferences, saveLayoutPreferences } from "../../services/layout-preferences.js";
import BuilderPreviewControls from "./BuilderPreviewControls.vue";
import BuilderTemplates from "./BuilderTemplates.vue";
import BuilderSidebar from "./BuilderSidebar.vue";
import BuilderCanvas from "./BuilderCanvas.vue";
import BuilderInspector from "./BuilderInspector.vue";
import BuilderStyles from "./BuilderStyles.vue";
import BuilderResizeHandle from "./BuilderResizeHandle.vue";
import BuilderButton from "./BuilderButton.vue";

// Figma-like proportions: slim side panels leave most of the width to the canvas.
const LIMITS = { left: [220, 480, 264], right: [260, 720, 304] };
const clampWidth = (side, value) => {
	const [min, max, fallback] = LIMITS[side];
	return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

export default defineComponent({
	components: {
		BuilderPreviewControls,
		BuilderTemplates,
		BuilderSidebar,
		BuilderCanvas,
		BuilderInspector,
		BuilderStyles,
		BuilderResizeHandle,
		BuilderButton,
	},
	setup() {
		const builder = useBuilder();
		const leftWidth = ref(LIMITS.left[2]);
		const rightWidth = ref(LIMITS.right[2]);
		let saveTimer;
		function resizePanel(side, delta) {
			const target = side === "left" ? leftWidth : rightWidth;
			target.value = clampWidth(side, target.value + delta);
		}
		onMounted(() => {
			const saved = readLayoutPreferences();
			leftWidth.value = clampWidth("left", saved.left);
			rightWidth.value = clampWidth("right", saved.right);
			builder.sidebarCollapsed.value = saved.sidebarCollapsed === true;
			builder.inspectorCollapsed.value = saved.inspectorCollapsed === true;
			watch([leftWidth, rightWidth, builder.sidebarCollapsed, builder.inspectorCollapsed], () => {
				clearTimeout(saveTimer);
				saveTimer = setTimeout(() => saveLayoutPreferences({
					left: leftWidth.value,
					right: rightWidth.value,
					sidebarCollapsed: builder.sidebarCollapsed.value,
					inspectorCollapsed: builder.inspectorCollapsed.value,
				}), 250);
			});
		});
		onBeforeUnmount(() => clearTimeout(saveTimer));
		return {
			...builder,
			leftWidth,
			rightWidth,
			resizePanel,
		};
	},
});
</script>
