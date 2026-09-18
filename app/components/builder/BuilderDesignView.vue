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
			<!-- Canvas toolbar is off -->
			<div
				class="zb-canvas-toolbar shrink-0 flex hidden flex-wrap min-h-[72px] py-0 items-center justify-between gap-1.5 dark:border-b-none border-b-slim border-zaux-light-grey bg-zaux-white px-1.5 max-[1200px]:px-2"
			>
				<div class="zb-canvas-label min-w-0 max-w-[240px] hidden">
					<span
						class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
					>
						{{
							translate(
								mode === "library"
									? "zx_builder_library"
									: "zx_builder_templates",
							)
						}}
					</span>
					<strong
						v-if="mode === 'library'"
						class="mt-0.75 block truncate text-[14px] font-medium"
					>
						{{ activeDefinition?.name }}
					</strong>
					<!--
					<BuilderDropdown
						v-else
						:label="activeTemplate.name"
						:items="templateMenuItems"
						:disabled="remoteProjectBusy"
						btnTheme="alt1"
						btnSize="xs"
						class="mt-0.75 min-w-0 [&_button]:max-w-full"
						@select="templateAction"
					>
						<template #header>
							<p
								class="text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey"
							>
								{{ translate("zx_builder_templates") }}
							</p>
							<p class="mt-0.5 truncate text-[13px] font-semibold">
								{{ activeTemplate.name }}
							</p>
						</template>
					</BuilderDropdown>
					-->
				</div>
			</div>
			<BuilderPreviewControls class="pt-1.5" />
			<div
				v-if="mode === 'library'"
				class="zb-context-line flex justify-between gap-1.5 dark:text-utility-notice bg-utility-notice/30 px-3 py-1.5 text-[10px] text-zaux-dark-grey dark:text-set1-notice [&>button]:whitespace-nowrap [&>button]:text-zaux-accent [&>button]:underline"
			>
				<span>{{ translate("zx_builder_library_notice") }}</span
				><button class="!text-zaux-dark" @click="selectTemplate(activeTemplate.id)">
					{{ translate("zx_builder_back_template") }} ↗
				</button>
			</div>
			<BuilderCanvas />
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
import { computed, defineComponent, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import BuilderPreviewControls from "./BuilderPreviewControls.vue";
import BuilderButton from "./BuilderButton.vue";
import BuilderSidebar from "./BuilderSidebar.vue";
import BuilderCanvas from "./BuilderCanvas.vue";
import BuilderInspector from "./BuilderInspector.vue";
import BuilderStyles from "./BuilderStyles.vue";
import BuilderResizeHandle from "./BuilderResizeHandle.vue";
import BuilderDropdown from "./BuilderDropdown.vue";
export default defineComponent({
	components: {
		BuilderPreviewControls,
		BuilderDropdown,
		BuilderButton,
		BuilderSidebar,
		BuilderCanvas,
		BuilderInspector,
		BuilderStyles,
		BuilderResizeHandle,
	},
	setup() {
		const builder = useBuilder();
		const templateMenuItems = computed(() => {
			const t = builder.translate;
			const disabled = !builder.canEditRemote.value;
			return [
				...builder.document.value.templates.map((template, index) => ({
					id: "open:" + template.id,
					templateId: template.id,
					label: template.name,
					active: template.id === builder.activeTemplate.value.id,
					heading: index === 0 ? t("zx_builder_templates") : undefined,
				})),
				{
					id: "new",
					label: t("zx_builder_new_template"),
					icon: "add",
					separator: true,
					disabled,
				},
				{ id: "rename", label: t("zx_builder_rename"), icon: "edit", disabled },
				{
					id: "duplicate",
					label: t("zx_builder_duplicate"),
					icon: "copy",
					disabled,
				},
				{
					id: "delete",
					label: t("zx_builder_delete"),
					icon: "delete",
					separator: true,
					danger: true,
					disabled,
				},
			];
		});
		function templateAction(item) {
			if (builder.remoteProjectBusy.value) return;
			if (item.templateId) {
				builder.selectTemplate(item.templateId);
				return;
			}
			if (!builder.canEditRemote.value) return;
			const template = builder.activeTemplate.value;
			if (item.id === "new") builder.modal.value = { type: "new-template" };
			else if (item.id === "duplicate")
				builder.duplicate("template", template.id);
			else
				builder.modal.value = {
					type: item.id,
					kind: "template",
					id: template.id,
					name: template.name,
				};
		}
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
			templateMenuItems,
			templateAction,
			leftWidth,
			rightWidth,
			resizePanel,
		};
	},
});
</script>
