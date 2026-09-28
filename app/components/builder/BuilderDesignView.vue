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
				:label="translate(sidebarCollapsed ? 'zx_builder_show_sidebar' : 'zx_builder_hide_sidebar')"
				:aria-expanded="!sidebarCollapsed"
				aria-controls="zb-sidebar-panel"
				@click="sidebarCollapsed = !sidebarCollapsed"
			/>
		</div>
		<main
			class="zb-main flex min-w-0 flex-1 flex-col max-[900px]:h-[80dvh] max-[900px]:w-[calc(100%_-_210px)]"
		>
			<BuilderPreviewControls class="pt-1.5" />
			<div
				v-if="mode === 'library' && !templatesOpen"
				class="zb-context-line flex justify-between gap-1.5 dark:text-utility-notice bg-utility-notice/30 px-3 py-1.5 text-[10px] text-zaux-dark-grey dark:text-set1-notice [&>button]:whitespace-nowrap [&>button]:text-zaux-accent [&>button]:underline"
			>
				<span>{{ translate("zx_builder_library_notice") }}</span
				><button class="!text-zaux-dark" @click="selectTemplate(activeTemplate.id)">
					{{ translate("zx_builder_back_template") }} ↗
				</button>
			</div>
			<BuilderTemplates v-if="templatesOpen" />
			<BuilderCanvas v-else />
			<!--
				<footer
					class="zb-canvas-footer hidden items-center justify-between gap-3 border-t-slim border-zaux-light-grey bg-zaux-white px-3 py-1.5 text-[9px] leading-[1.5] text-zaux-dark-grey [&>span:last-child]:whitespace-nowrap max-[1200px]:[&>span:last-child]:hidden max-[900px]:hidden"
				>
					<span>{{
						previewOnly
							? translate("zx_builder_preview_interaction")
							: translate("zx_builder_drag_hint")
					}}</span
					><span>{{ translate("zx_builder_readonly_source") }}</span>
				</footer>
				--></main>
		<div
			v-show="!previewOnly"
			class="group/panel relative flex min-h-0 shrink-0"
			:class="inspectorCollapsed && !stylesOpen ? 'max-[900px]:absolute max-[900px]:right-0 max-[900px]:top-0 max-[900px]:h-[80dvh]' : 'max-[900px]:w-full'"
		>
			<BuilderResizeHandle
				v-if="stylesOpen || !inspectorCollapsed"
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
				:label="translate(inspectorCollapsed ? 'zx_builder_show_inspector' : 'zx_builder_hide_inspector')"
				:aria-expanded="!inspectorCollapsed"
				aria-controls="zb-inspector-panel"
				@click="inspectorCollapsed = !inspectorCollapsed"
			/>
		</div>
	</div>
</template>
<script>
import { defineComponent, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import BuilderPreviewControls from "./BuilderPreviewControls.vue";
import BuilderTemplates from "./BuilderTemplates.vue";
import BuilderSidebar from "./BuilderSidebar.vue";
import BuilderCanvas from "./BuilderCanvas.vue";
import BuilderInspector from "./BuilderInspector.vue";
import BuilderStyles from "./BuilderStyles.vue";
import BuilderResizeHandle from "./BuilderResizeHandle.vue";
import BuilderButton from "./BuilderButton.vue";
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
		const leftWidth = ref(420);
		const rightWidth = ref(420);
		const sidebarCollapsed = ref(false);
		const inspectorCollapsed = ref(false);
		function resizePanel(side, delta) {
			const target = side === "left" ? leftWidth : rightWidth;
			target.value = Math.min(
				side === "left" ? 420 : 1000,
				Math.max(side === "left" ? 210 : 260, target.value + delta),
			);
		}
		return {
			...builder,
			leftWidth,
			rightWidth,
			sidebarCollapsed,
			inspectorCollapsed,
			resizePanel,
		};
	},
});
</script>
