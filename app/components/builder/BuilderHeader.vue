<template>
	<header class="shrink-0 bg-zaux-white">
		<div
			id="zb-top-bar"
			class="flex min-h-[60px] flex-wrap items-center justify-between gap-2 border-b-slim bg-zaux-dark border-zaux-light-grey px-3 py-2 max-[600px]:px-1.5"
		>
			<NuxtLink
				to="/"
				class="flex items-center gap-2 shrink-0 ext-set1-white"
				aria-label="Zaux Studio"
			>
				<img class="w-4" :src="studioLogo" alt="" />
				<span class="font-bold uppercase text-eyelet-s text-set1-white">Zaux studio</span>
			</NuxtLink>

			<div class="flex flex-wrap items-center justify-end gap-1 ml-auto">
				<BuilderDropdown
					:label="activeRemoteProject?.name || translate('zx_builder_projects')"
					:items="projectMenuItems"
					:disabled="remoteProjectBusy || projectOpening"
					btnTheme="dark2"
          btnSize="xs"
					@select="projectAction"
				>
					<template #header>
						<p
							class="text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey"
						>
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
					</template>
				</BuilderDropdown>
				<BuilderDropdown
					:label="activeTemplate.name"
					:items="templateMenuItems"
					:disabled="remoteProjectBusy || projectOpening"
					align="end"
          btnTheme="dark2"
          btnSize="xs"
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
				<BuilderDropdown
					:label="translate('zx_builder_account')"
					icon="user"
          btnTheme="dark2"
					align="end"
					:items="accountMenuItems"
            btnSize="xs"
					:disabled="remoteProjectBusy || projectOpening"
					@select="accountAction"
				>
					<template #header>
						<p
							class="text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey"
						>
							{{ translate("zx_builder_account") }}
						</p>
						<p class="mt-0.5 break-all text-[12px]">{{ user?.email }}</p>
					</template>
				</BuilderDropdown>
			</div>
		</div>

		<div
			class="zb-work-toolbar flex min-h-[56px] flex-wrap items-center justify-between gap-2 border-b-slim border-zaux-light-grey px-3 py-1.5 max-[600px]:px-1.5"
		>
			<div class="flex min-w-0 items-center gap-1.5 text-[12px]">
				<strong class="max-w-[240px] truncate font-medium">{{
					mode === "library" ? activeDefinition?.name : activeTemplate.name
				}}</strong>
				<span
					class="rounded-xxs bg-zaux-light px-0.75 py-0.25 font-mono text-[10px] text-zaux-dark-grey"
					>{{ mode === "library" ? "ZVC" : "ZVT" }}</span
				>
			</div>
			<div class="flex flex-wrap items-center justify-end gap-1 ml-auto">
				<span
					class="mr-1.5 text-[11px] text-zaux-dark-grey max-[1200px]:hidden"
					:class="{ '!text-utility-error': saveStatus === 'storage_error' }"
					role="status"
					>{{ translate("zx_builder_" + saveStatus) }}</span
				>
				<BuilderButton
					icon="undo"
					iconOnly
					:label="translate('zx_builder_undo')"
					:disabled="!undoStack.length"
					@click="undo"
				/>
				<BuilderButton
					icon="redo"
					iconOnly
					:label="translate('zx_builder_redo')"
					:disabled="!redoStack.length"
					@click="redo"
				/>
				<span
					class="mx-1 h-[24px] w-px bg-zaux-light-grey"
					aria-hidden="true"
				/>
				<BuilderButton
					icon="customize"
					:label="translate('zx_builder_style_settings')"
					:aria-pressed="stylesOpen"
					@click="
						stylesOpen = !stylesOpen;
						previewOnly = false;
					"
				/>
				<BuilderButton
					:label="translate('zx_builder_import')"
					@click="modal = { type: 'import' }"
				/>
				<BuilderButton
					variant="primary"
					icon="arrow-up-right"
					:label="translate('zx_builder_export')"
					@click="modal = { type: 'export' }"
				/>
			</div>
		</div>
	</header>
</template>
<script>
import studioLogo from "../../assets/images/logo-studio.svg?url";
import { defineComponent, computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBuilder } from "../../composables/useBuilder.js";
import { useAuth } from "../../composables/useAuth.js";
import BuilderButton from "./BuilderButton.vue";
import BuilderDropdown from "./BuilderDropdown.vue";

export default defineComponent({
	components: { BuilderButton, BuilderDropdown },
	setup() {
		const builder = useBuilder();
		const router = useRouter();
		const route = useRoute();
		// Creating or deleting from the editor changes its project identity.
		watch(() => builder.activeRemoteProject.value?.id, id => {
			const path = '/editor/' + (id ?? 'local');
			if (route.path !== path) router.replace(path);
		});
		const auth = useAuth();
		const projectOpening = ref(false);
		const projectMenuItems = computed(() => {
			const project = builder.activeRemoteProject.value;
			const t = builder.translate;
			return [
				{ id: 'hub', label: t('zx_builder_hub_back'), icon: 'arrow-up-right' },
				...builder.remoteProjects.value.map((item, index) => ({
					id: "open:" + item.id,
					projectId: item.id,
					label: item.name,
					active: item.id === project?.id,
					heading: index === 0 ? t("zx_builder_projects") : undefined,
				})),
				{
					id: "new",
					label: t("zx_builder_new_project"),
					icon: "add",
					separator: builder.remoteProjects.value.length > 0,
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
			if (item.id === 'hub') {
				await router.push('/');
				return;
			}
			if (item.projectId) {
				if (item.projectId === builder.activeRemoteProject.value?.id) return;
				projectOpening.value = true;
				try {
					await router.push('/editor/' + item.projectId);
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
		const accountMenuItems = computed(() => [
			{
				id: "logout",
				label: builder.translate("zx_builder_logout"),
				icon: "close",
			},
		]);
		async function accountAction(item) {
			if (item.id === "logout" && await builder.prepareToLeave()) {
				await auth.signOut();
				await router.push('/');
			}
		}
		return {
			studioLogo,
			...builder,
			user: auth.user,
			projectOpening,
			projectMenuItems,
			projectAction,
			templateMenuItems,
			templateAction,
			accountMenuItems,
			accountAction,
		};
	},
});
</script>
