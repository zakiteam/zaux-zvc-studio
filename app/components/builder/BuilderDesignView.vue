<template>
	<div class="zb-workbench flex min-h-0 flex-1 max-[900px]:flex-wrap">
		<BuilderSidebar
			v-show="!previewOnly"
			:width="leftWidth"
		/><BuilderResizeHandle
			v-if="!previewOnly"
			side="left"
			:label="translate('zx_builder_resize_left')"
			@resize="resizePanel('left', $event)"
		/>
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
		<BuilderResizeHandle
			v-if="!previewOnly"
			side="right"
			:label="translate('zx_builder_resize_right')"
			@resize="resizePanel('right', $event)"
		/><BuilderStyles
			v-if="stylesOpen && !previewOnly"
			:width="rightWidth"
		/><BuilderInspector
			v-show="!previewOnly && !stylesOpen"
			:width="rightWidth"
		/>
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
export default defineComponent({
	components: {
		BuilderPreviewControls,
		BuilderTemplates,
		BuilderSidebar,
		BuilderCanvas,
		BuilderInspector,
		BuilderStyles,
		BuilderResizeHandle,
	},
	setup() {
		const builder = useBuilder();
		const leftWidth = ref(420);
		const rightWidth = ref(420);
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
			resizePanel,
		};
	},
});
</script>
