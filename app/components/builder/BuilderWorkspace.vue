<template>
	<div
		v-if="workspaceReady"
		class="zb-app flex h-dvh flex-col overflow-hidden bg-zaux-light font-builder text-[13px] text-zaux-dark max-[900px]:h-auto max-[900px]:min-h-dvh max-[900px]:overflow-auto"
		:class="{ 'zb-app--preview': previewOnly }"
	>
		<BuilderHeader />
		<div
			v-if="recovery !== null || incoming || error || remoteConflict"
			class="zb-notice flex items-center gap-2 bg-utility-warning/20 px-3 py-1.5 text-[11px] text-zaux-dark [&>span]:flex-1 [&_button]:underline"
			role="alert"
		>
			<template v-if="recovery !== null">
				<span>{{ translate("zx_builder_recovery") }}</span>
				<button @click="downloadRecovery">
					{{ translate("zx_builder_download_recovery") }}
				</button>
				<button @click="modal = { type: 'resume' }">
					{{ translate("zx_builder_resume_saving") }}
				</button>
			</template>
			<template v-else-if="incoming"
				><span>{{ translate("zx_builder_conflict") }}</span
				><button @click="resolveConflict(true)">
					{{ translate("zx_builder_use_remote") }}</button
				><button @click="resolveConflict(false)">
					{{ translate("zx_builder_keep_local") }}
				</button></template
			>
			<template v-else-if="remoteConflict"
				><span>{{ translate("zx_builder_remote_conflict_notice") }}</span
				><button @click="openRemoteProject(activeRemoteProject.id)">
					{{ translate("zx_builder_reload_remote") }}
				</button></template
			>
			<template v-else
				><span>{{ translate(error) }}</span
				><button @click="error = ''">
					{{ translate("zx_builder_close") }}
				</button></template
			>
		</div>
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
				<div
					class="zb-canvas-toolbar flex h-[72px] min-h-[72px] items-center justify-between gap-1.5 dark:border-b-none border-b-slim border-zaux-light-grey bg-zaux-white px-3 max-[1200px]:px-2"
				>
					<div class="zb-canvas-label min-w-0 max-w-[240px]">
						<span class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
							{{ translate(mode === 'library' ? 'zx_builder_library' : 'zx_builder_templates') }}
						</span>
						<strong v-if="mode === 'library'" class="mt-0.75 block truncate text-[14px] font-medium">
							{{ activeDefinition?.name }}
						</strong>
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
								<p class="text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey">
									{{ translate('zx_builder_templates') }}
								</p>
								<p class="mt-0.5 truncate text-[13px] font-semibold">{{ activeTemplate.name }}</p>
							</template>
						</BuilderDropdown>
					</div>
					<div class="flex flex-col min-w-0 gap-1 py-2">
						<div class="flex items-stretch min-w-0 gap-1">
							<BuilderInput
								type="select"
								v-model="viewportMode"
								:label="translate('zx_builder_viewport_mode')"
								:options="[
									{ value: 'simple', label: translate('zx_builder_viewport_simple') },
									{ value: 'zaux', label: translate('zx_builder_viewport_zaux') },
								]"
								class="min-w-0 text-[10px] h-full [&_*]:h-full"
							/>
							<BuilderInput
								v-if="viewportMode === 'simple'"
								type="select"
								v-model="simpleViewport"
								:options="simpleViewportOptions"
								:label="translate('zx_builder_viewport')"
								class="min-w-0 rounded-xs border-slim border-zaux-light-grey bg-zaux-light text-[11px]"
							/>
							<BuilderInput
								v-else
								type="select"
								v-model="viewport"
								:options="viewportOptions"
								:label="translate('zx_builder_viewport')"
								class="min-w-0 rounded-xs border-slim border-zaux-light-grey bg-zaux-light text-[11px]"
							/>
						</div>
						<label class="flex cursor-pointer items-center gap-1 text-[10px] text-zaux-dark-grey mx-auto">
							<input v-model="followViewportStyles" type="checkbox" class="w-1.5 h-1.5 accent-zaux-accent" />
							<span>{{ translate('zx_builder_follow_viewport_styles') }}</span>
						</label>
					</div>
					<BuilderButton
						size="xs"
						:label="
							translate(
								previewOnly ? 'zx_builder_design' : 'zx_builder_preview',
							)
						"
						:icon="previewOnly ? 'edit' : 'visibility'"
						@click="previewOnly = !previewOnly"
					/>
				</div>
				<div
					v-if="mode === 'library'"
					class="zb-context-line flex justify-between gap-1.5 bg-zaux-accent/5 px-3 py-1.5 text-[10px] text-zaux-dark-grey [&>button]:whitespace-nowrap [&>button]:text-zaux-accent [&>button]:underline"
				>
					<span>{{ translate("zx_builder_library_notice") }}</span
					><button @click="selectTemplate(activeTemplate.id)">
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
				-->
			</main>
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
		<BuilderDialog v-if="modal" />
	</div>
  <main v-else class="grid h-screen p-4 min-h-dvh place-items-center bg-zaux-light font-builder text-zaux-dark">
    <div class="text-center">
      <p :role="error ? 'alert' : 'status'">{{ translate(error || 'zx_builder_loading') }}</p>
      <NuxtLink to="/" class="inline-block mt-2 underline text-zaux-accent">{{ translate('zx_builder_hub_back') }}</NuxtLink>
    </div>
  </main>
</template>
<script>
import { computed, defineComponent, ref } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
import { createBuilder } from "../../composables/useBuilder.js";
import { downloadText } from "../../services/files.js";
import BuilderButton from "./BuilderButton.vue";
import BuilderSidebar from "./BuilderSidebar.vue";
import BuilderCanvas from "./BuilderCanvas.vue";
import BuilderInspector from "./BuilderInspector.vue";
import BuilderDialog from "./BuilderDialog.vue";
import BuilderStyles from "./BuilderStyles.vue";
import BuilderResizeHandle from "./BuilderResizeHandle.vue";
import BuilderHeader from "./BuilderHeader.vue";
import BuilderInput from "./fields/BuilderInput.vue";
import BuilderDropdown from "./BuilderDropdown.vue";
export default defineComponent({
	components: {
		BuilderInput,
		BuilderDropdown,
		BuilderButton,
		BuilderSidebar,
		BuilderCanvas,
		BuilderInspector,
		BuilderDialog,
		BuilderStyles,
		BuilderResizeHandle,
		BuilderHeader,
	},
	props: { projectId: { type: String, default: null } },
	setup(props) {
		const builder = createBuilder({ projectId: props.projectId });
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
		onBeforeRouteLeave(builder.prepareToLeave);
		onBeforeRouteUpdate(builder.prepareToLeave);
		const leftWidth = ref(400);
		const rightWidth = ref(600);
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
			downloadRecovery: () =>
				downloadText("zaux-recovery.json", builder.recovery.value ?? ""),
		};
	},
});
</script>
