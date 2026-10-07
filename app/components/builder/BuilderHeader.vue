<template>
	<header class="zb-topbar shrink-0 border-b-slim border-zaux-light-grey bg-zaux-white">
		<div class="flex h-[44px] min-w-0 items-center gap-1 px-1 max-[900px]:h-auto max-[900px]:flex-wrap max-[900px]:py-0.5">
			<!-- Main menu: app-level actions, as in Figma's top-left menu. -->
			<div class="flex shrink-0 items-center gap-0.5">
				<NuxtLink
					to="/"
					class="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-xxs hover:bg-zaux-light"
					:title="translate('zx_builder_hub_back')"
					:aria-label="'Zaux Studio: ' + translate('zx_builder_hub_back')"
				>
					<img class="w-[18px]" :src="studioLogo" alt="" />
				</NuxtLink>
				<BuilderDropdown
					:label="translate('zx_builder_main_menu')"
					icon="hamburger"
					iconOnly
					:extraTriggerProps="{ iconName: 'hamburger', hasIcon: true, actionIcon: false }"
					btnTheme="alt1"
					:items="mainMenuItems"
					:disabled="remoteProjectBusy || projectOpening"
					@select="mainAction"
				/>
			</div>
			<span class="h-[20px] w-px shrink-0 bg-zaux-light-grey" aria-hidden="true" />
			<BuilderModeSwitcher class="shrink-0" />
			<span class="h-[20px] w-px shrink-0 bg-zaux-light-grey" aria-hidden="true" />

			<!-- Breadcrumb: project / template. -->
			<div class="flex min-w-0 max-w-[360px] shrink items-center gap-0.25">
				<BuilderDropdown
					class="min-w-0"
					:label="activeRemoteProject?.name || translate('zx_builder_local')"
					:items="projectMenuItems"
					:disabled="remoteProjectBusy || projectOpening"
					btnTheme="alt1"
					:extraTriggerProps="{ class: '!max-w-[180px] !text-[11px] text-zaux-dark-grey', title: translate('zx_builder_project') + ': ' + (activeRemoteProject?.name || translate('zx_builder_local')) }"
					@select="projectAction"
				>
					<template #header>
						<p class="text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey">
							{{ translate("zx_builder_current_project") }}
						</p>
						<p class="mt-0.5 truncate text-[13px] font-semibold">
							{{ activeRemoteProject?.name || translate("zx_builder_local") }}
						</p>
						<p class="mt-1 text-[10px] text-zaux-dark-grey" role="status">
							{{
								translate(
									activeRemoteProject
										? "zx_builder_remote_" + remoteSaveStatus
										: "zx_builder_" + saveStatus,
								)
							}}
						</p>
						<BuilderThumbnailControls />
					</template>
				</BuilderDropdown>
				<template v-if="workspaceView === 'design'">
					<span class="shrink-0 text-[12px] text-zaux-light-grey" aria-hidden="true">/</span>
					<button
						type="button"
						class="min-w-0 truncate rounded-xxs px-1 py-0.5 text-left text-[12px] font-semibold hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
						:class="templatesOpen ? 'bg-zaux-light text-zaux-accent' : 'text-zaux-dark'"
						:title="translate('zx_builder_manage_templates') + ': ' + activeTemplate.name"
						:aria-label="translate('zx_builder_manage_templates') + ': ' + activeTemplate.name"
						:aria-pressed="templatesOpen"
						:disabled="remoteProjectBusy"
						@click="templatesOpen = !templatesOpen"
					>
						{{ activeTemplate.name }}
					</button>
				</template>
			</div>

			<!-- Open entities, like Figma's file tabs. Kept mounted to preserve session history. -->
			<div class="flex min-w-0 flex-1 items-center gap-0.5 pl-1">
				<BuilderButton
					v-show="workspaceView === 'design'"
					class="shrink-0"
					icon="search"
					iconOnly
					size="xs"
					variant="alt1"
					:label="translate('zx_builder_cmd_palette') + ' (Ctrl P)'"
					:disabled="remoteProjectBusy"
					@click="commandPaletteOpen = true"
				/>
				<div v-show="workspaceView === 'design'" class="min-w-0">
					<BuilderWorkspaceTabs />
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-0.5">
				<span
					class="mr-1 max-w-[140px] truncate text-[11px] text-zaux-dark-grey max-[1300px]:hidden"
					:class="{ '!text-utility-error': saveStatus === 'storage_error' }"
					role="status"
					>{{ translate("zx_builder_" + saveStatus) }}</span
				>
				<BuilderButton
					icon="undo"
					iconOnly
					size="xs"
					variant="alt1"
					:label="translate('zx_builder_undo') + ' (Ctrl Z)'"
					:disabled="!undoStack.length"
					@click="undo"
				/>
				<BuilderButton
					icon="redo"
					iconOnly
					size="xs"
					variant="alt1"
					:label="translate('zx_builder_redo') + ' (Ctrl Shift Z)'"
					:disabled="!redoStack.length"
					@click="redo"
				/>
				<span class="mx-0.5 h-[20px] w-px bg-zaux-light-grey" aria-hidden="true" />
				<BuilderButton
					size="xs"
					icon="download"
					:extraProps="{ actionIcon: false }"
					:label="translate('zx_builder_export')"
					@click="modal = { type: 'export' }"
				/>
				<BuilderButton
					size="xs"
					variant="primary"
					icon="play"
					iconOnly
					:label="translate('zx_builder_open_preview_page')"
					@click="openPreviewPage"
				/>
				<BuilderDropdown
					:label="translate('zx_builder_account')"
					icon="user"
					iconOnly
					:extraTriggerProps="{ iconName: 'user', hasIcon: true, actionIcon: false }"
					btnTheme="alt1"
					align="end"
					:items="accountMenuItems"
					:disabled="remoteProjectBusy || projectOpening"
					@select="accountAction"
				>
					<template #header>
						<p class="text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey">
							{{ translate("zx_builder_account") }}
						</p>
						<p class="mt-0.5 break-all text-[12px]">{{ user?.email }}</p>
					</template>
				</BuilderDropdown>
			</div>
		</div>
		<BuilderMediaPicker
			v-if="mediaMode"
			:projectId="activeRemoteProject?.id"
			:canManageProject="canEditRemote"
			:readonly="!canEditRemote"
			:manageOnly="mediaMode === 'library'"
			:scopeOnly="mediaMode === 'cover' ? 'project' : undefined"
			:clearable="mediaMode === 'cover'"
			@close="mediaMode = ''"
			@select="selectMedia"
		/>
		<BuilderFontLibrary
			v-if="fontsOpen"
			:modelValue="document.styles.fonts ?? []"
			:readonly="!canEditRemote"
			@close="fontsOpen = false"
			@apply="applyFonts"
		/>
		<BuilderProjectBridge v-if="bridgeOpen" @close="bridgeOpen = false" />
	</header>
</template>
<script>
import studioLogo from "../../assets/images/logo-studio.svg?url";
import { defineComponent, computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBuilder } from "../../composables/useBuilder.js";
import { useAuth } from "../../composables/useAuth.js";
import { useStudioTheme } from "../../composables/useStudioTheme.js";
import BuilderButton from "./BuilderButton.vue";
import BuilderDropdown from "./BuilderDropdown.vue";
import BuilderModeSwitcher from "./BuilderModeSwitcher.vue";
import BuilderWorkspaceTabs from "./BuilderWorkspaceTabs.vue";
import BuilderThumbnailControls from "./BuilderThumbnailControls.vue";
import BuilderMediaPicker from "./BuilderMediaPicker.vue";
import BuilderFontLibrary from "./BuilderFontLibrary.vue";
import BuilderProjectBridge from "./BuilderProjectBridge.vue";

export default defineComponent({
	components: {
		BuilderThumbnailControls,
		BuilderButton,
		BuilderDropdown,
		BuilderModeSwitcher,
		BuilderWorkspaceTabs,
		BuilderMediaPicker,
		BuilderFontLibrary,
		BuilderProjectBridge,
	},
	setup() {
		const builder = useBuilder();
		const router = useRouter();
		const route = useRoute();

		// Creating or deleting from the editor changes its project identity.
		watch(
			() => builder.activeRemoteProject.value?.id,
			(id) => {
				const path = "/editor/" + (id ?? "local");
				if (route.path !== path) router.replace(path);
			},
		);
		const auth = useAuth();
		const { theme, toggleTheme } = useStudioTheme();
		const isAppDarkTheme = computed(() => theme.value === "dark");
		const projectOpening = ref(false);
		const mediaMode = ref("");
		const fontsOpen = ref(false);
		const bridgeOpen = ref(false);
		function applyFonts(fonts) {
			builder.updateProjectFonts(fonts);
			fontsOpen.value = false;
		}
		function selectMedia(asset) {
			if (mediaMode.value === "cover") builder.updateProjectCover(asset?.url);
			mediaMode.value = "";
		}
		const mainMenuItems = computed(() => {
			const t = builder.translate;
			const busy = builder.thumbnailBatch.value.running || !builder.workspaceReady.value;
			return [
				{ id: "hub", label: t("zx_builder_hub_back"), icon: "arrow-up-right" },
				{ id: "import", label: t("zx_builder_import"), icon: "upload", separator: true },
				{ id: "export", label: t("zx_builder_export"), icon: "download" },
				{ id: "bridge", label: t("zx_builder_bridge") },
				{ id: "media", label: t("zx_builder_media_library"), separator: true },
				{ id: "fonts", label: t("zx_builder_fonts_project") },
				{ id: "thumbnails-missing", heading: t("zx_builder_thumbnails"), label: t("zx_builder_thumbnails_missing"), disabled: busy },
				{ id: "thumbnails-all", label: t("zx_builder_thumbnails_all"), disabled: busy },
			];
		});
		async function mainAction(item) {
			if (item.id === "import" || item.id === "export") {
				builder.modal.value = { type: item.id };
				return;
			}
			if (item.id === "bridge") {
				bridgeOpen.value = true;
				return;
			}
			await projectAction(item);
		}
		const projectMenuItems = computed(() => {
			const project = builder.activeRemoteProject.value;
			const t = builder.translate;
			return [
				{
					id: "cover",
					label: t("zx_builder_media_cover"),
					hidden: !project || !builder.canEditRemote.value,
				},
				{
					id: "new",
					label: t("zx_builder_new_project"),
					icon: "add",
				},
				{
					id: "save",
					label: t("zx_builder_save_remote"),
					icon: "upload",
					hidden: !project,
					disabled: !builder.canEditRemote.value,
				},
				{
					id: "rename",
					label: t("zx_builder_rename_project"),
					icon: "edit",
					hidden: !project || !builder.canEditRemote.value,
				},
				{
					id: "delete",
					label: t("zx_builder_delete_project"),
					icon: "delete",
					danger: true,
					separator: true,
					hidden: project?.role !== "owner",
				},
			];
		});
		async function projectAction(item) {
			if (builder.remoteProjectBusy.value || projectOpening.value) return;
			if (item.id === "thumbnails-missing" || item.id === "thumbnails-all") {
				builder.refreshLibraryThumbnails({ missingOnly: item.id === "thumbnails-missing" });
				return;
			}
			if (item.id === "fonts") {
				fontsOpen.value = true;
				return;
			}
			if (item.id === "media" || item.id === "cover") {
				mediaMode.value = item.id === "cover" ? "cover" : "library";
				return;
			}
			if (item.id === "hub") {
				await router.push("/");
				return;
			}
			if (item.projectId) {
				if (item.projectId === builder.activeRemoteProject.value?.id) return;
				projectOpening.value = true;
				try {
					await router.push("/editor/" + item.projectId);
				} finally {
					projectOpening.value = false;
				}
			} else if (item.id === "new")
				builder.modal.value = { type: "new-project" };
			else if (item.id === "save") await builder.flushRemoteSave(true);
			else {
				const project = builder.activeRemoteProject.value;
				if (project)
					builder.modal.value = {
						type: item.id + "-project",
						id: project.id,
						name: project.name,
					};
			}
		}

		const accountMenuItems = computed(() => [
			{
				id: "language-it",
				heading: builder.translate("zx_builder_language"),
				label: builder.translate("zx_builder_language_it"),
				active: builder.language.value === "it",
			},
			{
				id: "language-en",
				label: builder.translate("zx_builder_language_en"),
				active: builder.language.value === "en",
			},
			{
				id: "theme",
				separator: true,
				label: builder.translate(
					theme.value === "dark"
						? "zx_builder_theme_light"
						: "zx_builder_theme_dark",
				),
			},
			{
				id: "logout",
				label: builder.translate("zx_builder_logout"),
				icon: "close",
			},
		]);
		async function accountAction(item) {
			if (item.id === "language-it" || item.id === "language-en") {
				builder.setLanguage(item.id.slice(-2));
				return;
			}
			if (item.id === "theme") {
				toggleTheme();
				return;
			}
			if (item.id === "logout" && (await builder.prepareToLeave())) {
				await auth.signOut();
				await router.push("/");
			}
		}
		return {
			studioLogo,
			...builder,
			user: auth.user,
			projectOpening,
			mediaMode,
			selectMedia,
			fontsOpen,
			applyFonts,
			bridgeOpen,
			mainMenuItems,
			mainAction,
			projectMenuItems,
			projectAction,
			accountMenuItems,
			accountAction,
			isAppDarkTheme,
			toggleTheme,
		};
	},
});
</script>
