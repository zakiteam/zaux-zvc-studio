<template>
	<dialog
		ref="dialog"
		:aria-labelledby="titleId"
		class="w-[680px] max-w-[calc(100vw-32px)] max-h-[90dvh] overflow-auto rounded-s border-none bg-zaux-white p-4 font-builder text-zaux-dark shadow-deeper backdrop:bg-zaux-black/40"
		@keydown.stop
		@cancel="onCancel"
		@close="$emit('close')"
	>
		<header class="flex items-center justify-between gap-2 mb-3">
			<h2 :id="titleId" class="text-[20px] font-medium">{{ translate("zx_builder_bridge") }}</h2>
			<BuilderButton icon="close" iconOnly :label="translate('zx_builder_close')" :disabled="busy" @click="close" />
		</header>

		<p class="mb-2 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate("zx_builder_bridge_hint") }}</p>

		<p v-if="unsupported" role="alert" class="mb-2 text-[12px] text-utility-error">
			{{ translate("zx_builder_bridge_unsupported") }}
		</p>

		<template v-else>
			<div v-if="!rootName" class="mb-3">
				<BuilderButton variant="primary" :label="translate('zx_builder_bridge_choose')" @click="choose" />
			</div>

			<template v-else>
				<div class="mb-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2 text-[12px] [&_p]:mb-1">
					<p>
						<span class="text-zaux-dark-grey">{{ translate("zx_builder_bridge_project") }}:</span>
						{{ projectName || "—" }}
					</p>
					<p>
						<span class="text-zaux-dark-grey">{{ translate("zx_builder_bridge_version") }}:</span>
						{{ destinationVersion || "—" }}
						<span class="text-zaux-dark-grey">(builder {{ builderVersion }})</span>
					</p>
					<p v-if="!projectValid" role="alert" class="text-utility-error">{{ translate("zx_builder_bridge_no_project") }}</p>
					<p v-else-if="versionMismatch" role="alert" class="text-utility-error">
						{{ translate("zx_builder_bridge_version_mismatch", { destination: destinationVersion, builder: builderVersion }) }}
					</p>
					<label v-if="versionMismatch" class="mt-1 flex cursor-pointer items-center gap-1.5 text-[11px]">
						<input v-model="accepted" type="checkbox" class="!w-auto accent-zaux-accent" />
						<span>{{ translate("zx_builder_bridge_accept") }}</span>
					</label>
				</div>

				<div class="mb-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2">
					<p class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zaux-dark-grey">{{ translate("zx_builder_bridge_parts") }}</p>
					<label v-for="part in partOptions" :key="part.key" class="flex items-center gap-1.5 py-0.5 text-[12px]">
						<input v-model="parts[part.key]" type="checkbox" :disabled="busy" class="!w-auto accent-zaux-accent" />
						<span>{{ translate(part.label) }}</span>
					</label>
				</div>

				<div class="mb-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2">
					<div class="mb-1 flex items-center gap-1.5">
						<BuilderButton size="xs" :label="translate('zx_builder_bridge_up')" :disabled="segments.length === 0 || busy" @click="up" />
						<span class="truncate font-mono text-[11px] text-zaux-dark-grey">{{ currentPath }}</span>
					</div>
					<ul class="max-h-[220px] overflow-auto flex flex-col [&_button]:rounded-xxs [&_button]:px-1.5 [&_button]:py-1 [&_button]:text-left [&_button]:text-[12px] hover:[&_button]:bg-zaux-accent/10">
						<li v-for="entry in entries" :key="entry.name">
							<button type="button" :disabled="busy" @click="entry.kind === 'directory' && enter(entry.name)">
								{{ entry.name }}<span v-if="entry.kind === 'directory'" class="text-zaux-dark-grey">/</span>
							</button>
						</li>
					</ul>
					<p v-if="!entries.length" class="py-1 text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_bridge_empty") }}</p>
				</div>

				<p v-if="fontLinks" class="mb-2 text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_bridge_fonts") }}</p>
			</template>

			<p v-if="filesError" role="alert" class="mb-2 text-[12px] text-utility-error">{{ translate(filesError) }}</p>
			<p v-if="error" role="alert" class="mb-2 text-[12px] text-utility-error">{{ translate(error) }}</p>
			<p v-if="done" role="status" class="mb-2 text-[12px] text-zaux-accent">{{ translate("zx_builder_bridge_done") }}</p>

			<footer class="flex flex-wrap items-center justify-end gap-1 mt-3">
				<BuilderButton :label="translate('zx_builder_cancel')" :disabled="busy" @click="close" />
				<BuilderButton
					variant="primary"
					:label="translate(busy ? 'zx_builder_bridge_writing' : 'zx_builder_bridge_export')"
					:disabled="!canExport || busy"
					@click="writeProject"
				/>
			</footer>
		</template>
	</dialog>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref, useId } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { projectStarterFiles } from "../../services/starter-export.js";
import { bridgeFiles, compareZauxVersions } from "../../../domain/zaux-bridge.js";
import { zauxCoreVersion } from "../../../integrations/zaux/version.js";
import {
	isBridgeSupported,
	pickProjectDirectory,
	listDirectory,
	detectProject,
	exportToProject,
} from "../../services/zaux-bridge.js";
import BuilderButton from "./BuilderButton.vue";

export default defineComponent({
	components: { BuilderButton },
	emits: ["close"],
	setup() {
		const builder = useBuilder();
		const { translate } = builder;
		const dialog = ref(null);
		const titleId = useId();

		const unsupported = !isBridgeSupported();
		const busy = ref(false);
		const error = ref("");
		const done = ref(false);

		let dirStack = [];
		const rootName = ref("");
		const segments = ref([]);
		const entries = ref([]);
		const projectName = ref("");
		const destinationVersion = ref("");
		const projectValid = ref(false);
		const accepted = ref(false);
		const parts = reactive({ components: true, imported: false, templates: true, styles: true, fonts: true });
		const partOptions = [
			{ key: "components", label: "zx_builder_bridge_part_components" },
			{ key: "imported", label: "zx_builder_bridge_part_imported" },
			{ key: "templates", label: "zx_builder_bridge_part_templates" },
			{ key: "styles", label: "zx_builder_bridge_part_styles" },
			{ key: "fonts", label: "zx_builder_bridge_part_fonts" },
		];

		const builderVersion = zauxCoreVersion;
		const currentPath = computed(() => rootName.value + (segments.value.length ? "/" + segments.value.join("/") : ""));

		const files = computed(() => {
			try {
				return { ...bridgeFiles(projectStarterFiles(builder.document.value, undefined, { ...parts })), error: "" };
			} catch (exception) {
				return { projectFiles: {}, fontLinks: "", error: exception.message?.startsWith("zx_") ? exception.message : "zx_builder_starter_error" };
			}
		});
		const fontLinks = computed(() => files.value.fontLinks);
		const filesError = computed(() => files.value.error);
		const versionMismatch = computed(() => projectValid.value && !!destinationVersion.value && !compareZauxVersions(builderVersion, destinationVersion.value).match);
		const canExport = computed(() => projectValid.value && !filesError.value && (!versionMismatch.value || accepted.value) && !busy.value);

		function current() { return dirStack[dirStack.length - 1]; }

		async function loadEntries() {
			try { entries.value = await listDirectory(current()); }
			catch { entries.value = []; }
		}
		async function detect() {
			projectValid.value = false;
			projectName.value = "";
			destinationVersion.value = "";
			accepted.value = false;
			try {
				const info = await detectProject(current());
				projectName.value = info.name;
				destinationVersion.value = info.coreVersion;
				projectValid.value = info.valid;
			} catch { /* Treat as not a Zaux project. */ }
		}
		function refresh() { return Promise.all([loadEntries(), detect()]); }

		async function choose() {
			error.value = "";
			done.value = false;
			try {
				const picked = await pickProjectDirectory();
				dirStack = [picked.handle];
				rootName.value = picked.name;
				segments.value = [];
				await refresh();
			} catch (exception) {
				if (exception?.name === "AbortError") return;
				error.value = "zx_builder_bridge_error";
			}
		}
		async function enter(name) {
			try {
				const handle = await current().getDirectoryHandle(name);
				dirStack.push(handle);
				segments.value.push(name);
				await refresh();
			} catch { error.value = "zx_builder_bridge_error"; }
		}
		async function up() {
			if (dirStack.length <= 1) return;
			dirStack.pop();
			segments.value.pop();
			await refresh();
		}
		async function writeProject() {
			if (!canExport.value) return;
			busy.value = true;
			error.value = "";
			done.value = false;
			try {
				await exportToProject(current(), files.value.projectFiles, fontLinks.value);
				done.value = true;
			} catch (exception) {
				error.value = exception?.message === "zx_builder_bridge_permission" ? "zx_builder_bridge_permission" : "zx_builder_bridge_error";
			} finally { busy.value = false; }
		}
		function close() { if (!busy.value) dialog.value?.close(); }
		function onCancel(event) { if (busy.value) event.preventDefault(); }

		let previousFocus;
		onMounted(() => { previousFocus = document.activeElement; dialog.value.showModal(); });
		onBeforeUnmount(() => { dialog.value?.close(); if (previousFocus?.isConnected) previousFocus.focus(); });

		return {
			dialog,
			titleId,
			translate,
			unsupported,
			busy,
			error,
			done,
			rootName,
			segments,
			entries,
			projectName,
			destinationVersion,
			builderVersion,
			projectValid,
			versionMismatch,
			accepted,
			parts,
			partOptions,
			currentPath,
			fontLinks,
			filesError,
			canExport,
			choose,
			enter,
			up,
			writeProject,
			close,
			onCancel,
		};
	},
});
</script>
