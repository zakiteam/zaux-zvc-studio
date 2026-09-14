<template>
	<div
		class="zb-dialog-backdrop fixed inset-0 z-[5000] grid place-items-center bg-zaux-black/40 p-4 backdrop-blur-[4px]"
		@mousedown.self="close"
	>
		<section
			ref="dialog"
			class="zb-dialog max-h-[90dvh] w-[440px] max-w-full overflow-auto rounded-s bg-zaux-white p-4 shadow-deeper [&.zb-dialog--wide]:w-[790px] [&>header]:mb-3 [&>header]:flex [&>header]:items-start [&>header]:justify-between [&_h2]:mt-1 [&_h2]:text-[25px] [&_h2]:font-normal [&_h2]:tracking-[-0.7px] [&>p]:text-[13px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey [&_footer]:mt-3 [&_footer]:flex [&_footer]:items-center [&_footer]:justify-end [&_footer]:gap-1.5 [&_footer>span]:!mr-auto"
			:class="{
				'zb-dialog--wide': ['import', 'export', 'new-component-json'].includes(
					modal.type,
				),
			}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			tabindex="-1"
			@keydown="trapFocus"
		>
			<header>
				<div>
					<span
						class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
						>ZAUX STUDIO</span
					>
					<h2 id="dialog-title">{{ title }}</h2>
				</div>
				<BuilderButton
					icon="close"
					iconOnly
					:label="translate('zx_builder_close')"
					@click="close"
				/>
			</header>
			<form
				v-if="
					[
						'new-component',
						'new-template',
						'new-project',
						'rename-project',
						'rename',
						'save-library',
					].includes(modal.type)
				"
				@submit.prevent="submitName"
			>
				<div
					class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
				>
					<label for="dialog-name">{{ translate("zx_builder_name") }}</label
					><input
						class="px-2 py-1 border-none bg-zaux-light"
						id="dialog-name"
						v-model="name"
						required
						maxlength="100"
						autocomplete="off"
					/>
				</div>
				<footer>
					<BuilderButton
						:label="translate('zx_builder_cancel')"
						@click="close"
					/><button
						class="zb-submit inline-flex min-h-[36px] items-center justify-center rounded-xxs bg-zaux-accent px-2.5 py-1.5 !text-[12px] text-zaux-white hover:bg-zaux-dark-accent disabled:cursor-wait disabled:opacity-60"
						:disabled="saving"
						type="submit"
					>
						{{
							translate(saving ? "zx_builder_remote_saving" : "zx_builder_save")
						}}
					</button>
				</footer>
			</form>
			<template v-else-if="modal.type === 'delete-project'">
				<p>
					{{
						translate("zx_builder_delete_project_confirm", { name: modal.name })
					}}
				</p>
				<footer>
					<BuilderButton
						:disabled="saving"
						:label="translate('zx_builder_cancel')"
						@click="close"
					/><BuilderButton
						variant="primary"
						:disabled="saving"
						:label="
							translate(
								saving
									? 'zx_builder_remote_saving'
									: 'zx_builder_delete_project',
							)
						"
						@click="deleteProject"
					/>
				</footer>
			</template>
			<template v-else-if="modal.type === 'delete' || modal.type === 'resume'"
				><p>
					{{
						translate(
							modal.type === "delete"
								? "zx_builder_delete_confirm"
								: "zx_builder_replace_workspace",
						)
					}}
				</p>
				<footer>
					<BuilderButton
						:label="translate('zx_builder_cancel')"
						@click="close"
					/><BuilderButton
						variant="primary"
						:label="translate('zx_builder_confirm')"
						@click="confirmAction"
					/></footer
			></template>
			<template v-else-if="modal.type === 'export'">
				<p
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_export_hint") }}
				</p>
				<div class="zb-row mb-2 mt-1.5 flex gap-1 [&>*]:flex-1">
					<select class="px-2 py-1 border-none bg-zaux-light" v-model="scope" :aria-label="translate('zx_builder_export')">
						<option value="workspace">
							{{ translate("zx_builder_workspace") }}
						</option>
						<option value="template">
							{{ translate("zx_builder_current_template") }}
						</option>
						<option v-if="activeDefinition" value="component">
							{{ translate("zx_builder_current_component") }}
						</option></select
					><select
						class="px-2 py-1 border-none bg-zaux-light"
						v-if="scope === 'component'"
						v-model="format"
						aria-label="Format"
					>
						<option value="json">
							{{ translate("zx_builder_json_editable") }}
						</option>
						<option value="runtime">
							{{ translate("zx_builder_json_runtime") }}
						</option>
						<option value="js">JavaScript</option>
					</select>
				</div>
				<p
					v-if="
						format === 'js' &&
						scope === 'component' &&
						!Object.keys(jsFiles).length
					"
					class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
				>
					{{ translate("zx_builder_source_missing") }}
				</p>
				<p
					v-if="format === 'runtime' && scope === 'component'"
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_runtime_hint") }}
				</p>
				<div
					v-if="format === 'js' && scope === 'component'"
					class="zb-file-tabs mb-1.5 flex flex-wrap gap-0.5 [&>button]:rounded-xxs [&>button]:p-1 [&>button]:font-mono [&>button]:text-[10px] [&>button]:text-zaux-dark-grey [&>button.active]:bg-zaux-accent/10 [&>button.active]:text-zaux-accent"
				>
					<button
						v-for="file in Object.keys(jsFiles)"
						:key="file"
						:class="{ active: selectedFile === file }"
						@click="selectedFile = file"
					>
						{{ file }}
					</button>
				</div>
				<BuilderCodeEditor
					:language="
						scope === 'component' && format === 'js'
							? selectedFile.endsWith('.css')
								? 'css'
								: 'javascript'
							: 'json'
					"
					:modelValue="exportText"
					readonly
					rows="18"
					label="Export"
				/>
				<footer>
					<span
						class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
						role="status"
						>{{ copied ? translate("zx_builder_copied") : "" }}</span
					><BuilderButton
						:label="translate('zx_builder_copy')"
						@click="copy"
					/><BuilderButton
						v-if="scope === 'component' && format === 'js'"
						variant="primary"
						:label="translate('zx_builder_download_js')"
						:disabled="!Object.keys(jsFiles).length"
						@click="downloadJs"
					/><BuilderButton
						v-else
						variant="primary"
						:label="translate('zx_builder_download_json')"
						@click="downloadJson"
					/>
				</footer>
			</template>
			<template v-else-if="modal.type === 'new-component-json'">
				<p class="mb-2 text-[12px] text-zaux-dark-grey">
					{{ translate("zx_builder_component_json_hint") }}
				</p>
				<BuilderCodeEditor
					v-model="componentText"
					label="ZVC JSON"
					:rows="18"
				/>
				<footer>
					<BuilderButton
						:label="translate('zx_builder_cancel')"
						@click="close"
					/><BuilderButton
						variant="primary"
						:label="translate('zx_builder_add')"
						:disabled="!componentText.trim() || !canEditRemote"
						@click="addComponentJson"
					/>
				</footer>
			</template>
			<template v-else-if="modal.type === 'import'">
				<p
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_import_hint") }}
				</p>
				<label
					class="zb-file-input my-3 flex flex-col gap-2 rounded-xs border-slim border-dashed border-zaux-light-grey bg-zaux-light p-2.5 text-zaux-dark-grey [&>input]:text-[11px]"
					><span>{{ translate("zx_builder_choose_file") }}</span
					><input
						type="file"
						accept=".json,application/json"
						@change="readFile"
				/></label>
				<div
					class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
				>
					<label for="import-json">{{
						translate("zx_builder_paste_json")
					}}</label
					><BuilderCodeEditor
						id="import-json"
						:label="translate('zx_builder_paste_json')"
						v-model="importText"
						rows="15"
					/>
				</div>
				<div
					v-if="pendingImport"
					class="zb-context-card mt-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2 [&_p]:mb-1.5 [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-zaux-dark-grey"
				>
					<p>{{ translate("zx_builder_replace_workspace") }}</p>
					<BuilderButton
						:label="translate('zx_builder_cancel')"
						@click="pendingImport = null"
					/><BuilderButton
						variant="primary"
						:label="translate('zx_builder_confirm')"
						@click="applyImport(pendingImport)"
					/>
				</div>
				<footer v-else>
					<BuilderButton
						:label="translate('zx_builder_cancel')"
						@click="close"
					/><BuilderButton
						variant="primary"
						:label="translate('zx_builder_import')"
						:disabled="!importText.trim()"
						@click="importJson"
					/>
				</footer>
			</template>
			<p
				v-if="localError"
				class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
				role="alert"
			>
				{{ translate(localError) }}
			</p>
			<p
				v-if="localErrorDetail"
				class="mt-1 text-[10px] leading-[1.5] text-zaux-dark-grey"
			>
				{{
					translate("zx_builder_remote_error_detail", {
						detail: localErrorDetail,
					})
				}}
			</p>
		</section>
	</div>
</template>
<script>
import {
	defineComponent,
	ref,
	computed,
	watch,
	onMounted,
	onBeforeUnmount,
	nextTick,
} from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import {
	documentEnvelope,
	parseDocument,
	parseComponentDocument,
} from "../../../domain/export.js";
import { createDefinition } from "../../../domain/workspace.js";
import { filesForDefinition } from "../../services/source-zvc.js";
import { clone, runtimeRoot, createNode } from "../../../domain/nodes.js";
import { downloadText, downloadZip } from "../../services/files.js";
import BuilderButton from "./BuilderButton.vue";
import BuilderCodeEditor from "./fields/BuilderCodeEditor.vue";
export default defineComponent({
	components: { BuilderCodeEditor, BuilderButton },
	setup() {
		const builder = useBuilder();
		const dialog = ref(null);
		const name = ref(builder.modal.value.name ?? "");
		const scope = ref(builder.modal.value.scope ?? "workspace");
		const format = ref("json");
		const selectedFile = ref("");
		const localError = ref("");
		const localErrorDetail = ref("");
		const copied = ref(false);
		const importText = ref("");
		const pendingImport = ref(null);
		const saving = ref(false);
		const example = createDefinition(builder.translate("zx_builder_new_name"));
		example.tree = [
			createNode("div", {
				class: "p-4",
				textContent: builder.translate("zx_builder_new_name"),
			}),
		];
		const componentText = ref(JSON.stringify(example, null, 2));
		function addComponentJson() {
			try {
				const payload = parseComponentDocument(componentText.value);
				builder.importDocument(payload);
				if (builder.error.value) {
					localError.value = builder.error.value;
					return;
				}
				close();
			} catch (error) {
				localError.value = error.message.startsWith("zx_")
					? error.message
					: "zx_builder_invalid_json";
			}
		}
		const previousFocus = document.activeElement;
		const titles = {
			"new-component-json": "new_component_json",
			"new-component": "new_component",
			"new-template": "new_template",
			"save-library": "save_library",
			"new-project": "new_project",
			"rename-project": "rename_project",
			"delete-project": "delete_project",
			rename: "rename",
			delete: "delete",
			import: "import",
			export: "export",
			resume: "resume_saving",
		};
		const title = computed(() =>
			builder.translate(`zx_builder_${titles[builder.modal.value.type]}`),
		);
		const definition = computed(() => {
			if (!builder.activeDefinition.value) return null;
			const result = clone(builder.activeDefinition.value);
			if (builder.mode.value === "template" && result.sourceKey)
				result.defaults = {
					...result.defaults,
					...clone(builder.activeInstance.value.data),
				};
			if (builder.mode.value === "template")
				result.fields.forEach((field) => {
					if (Object.hasOwn(builder.activeInstance.value.data, field.key))
						field.default = clone(builder.activeInstance.value.data[field.key]);
				});
			return result;
		});
		const jsFiles = computed(() => {
			try {
				return definition.value ? filesForDefinition(definition.value) : {};
			} catch {
				return {};
			}
		});
		const data = computed(() =>
			scope.value === "workspace"
				? builder.document.value
				: scope.value === "template"
					? builder.activeTemplate.value
					: definition.value,
		);
		const json = computed(() =>
			JSON.stringify(documentEnvelope(scope.value, data.value), null, 2),
		);
		const exportText = computed(() =>
			scope.value === "component" && format.value === "js"
				? (jsFiles.value[selectedFile.value] ?? Object.values(jsFiles.value)[0])
				: scope.value === "component" && format.value === "runtime"
					? JSON.stringify(runtimeRoot(definition.value), null, 2)
					: json.value,
		);
		watch(
			jsFiles,
			(files) => {
				selectedFile.value = Object.keys(files)[0] ?? "";
			},
			{ immediate: true },
		);
		function close() {
			if (!saving.value) builder.modal.value = null;
		}
		async function submitName() {
			if (!name.value.trim() || saving.value) return;
			const modal = builder.modal.value;
			if (modal.type === "new-component")
				builder.newComponent(name.value.trim());
			if (modal.type === "new-template") builder.newTemplate(name.value.trim());
			if (modal.type === "rename")
				builder.rename(modal.kind, modal.id, name.value.trim());
			if (modal.type === "save-library")
				builder.saveToLibrary(name.value.trim());
			if (["new-project", "rename-project"].includes(modal.type)) {
				saving.value = true;
				localError.value = "";
				localErrorDetail.value = "";
				const created =
					modal.type === "rename-project"
						? await builder.renameRemoteProject(modal.id, name.value.trim())
						: await builder.createRemoteProject(name.value.trim());
				saving.value = false;
				if (!created) {
					localError.value = builder.error.value || "zx_builder_remote_error";
					localErrorDetail.value = builder.remoteErrorDetail.value;
					return;
				}
			}
			close();
		}
		async function deleteProject() {
			if (saving.value) return;
			saving.value = true;
			localError.value = "";
			localErrorDetail.value = "";
			const deleted = await builder.deleteRemoteProject(builder.modal.value.id);
			saving.value = false;
			if (!deleted) {
				localError.value = builder.error.value || "zx_builder_remote_error";
				localErrorDetail.value = builder.remoteErrorDetail.value;
				return;
			}
			close();
		}
		function confirmAction() {
			if (builder.modal.value.type === "delete")
				builder.remove(builder.modal.value.kind, builder.modal.value.id);
			else {
				builder.recovery.value = null;
				builder.scheduleSave();
				builder.flushSave();
			}
			close();
		}
		async function copy() {
			try {
				await navigator.clipboard.writeText(exportText.value);
				copied.value = true;
			} catch {
				localError.value = "zx_builder_storage_error";
			}
		}
		function downloadJson() {
			downloadText(
				`zaux-${scope.value}${scope.value === "component" && format.value === "runtime" ? "-runtime" : ""}.json`,
				exportText.value,
			);
		}
		async function downloadJs() {
			try {
				await downloadZip(`${definition.value.exportName}.zip`, jsFiles.value);
			} catch {
				localError.value = "zx_builder_storage_error";
			}
		}
		async function readFile(event) {
			try {
				const file = event.target.files?.[0];
				if (!file) return;
				if (file.size > 5_000_000) throw new Error("zx_builder_file_too_large");
				importText.value = await file.text();
				localError.value = "";
			} catch (error) {
				localError.value = error.message;
			}
			event.target.value = "";
		}
		function applyImport(payload) {
			builder.importDocument(payload);
			close();
		}
		function importJson() {
			try {
				const payload = parseDocument(importText.value);
				if (payload.kind === "workspace") pendingImport.value = payload;
				else applyImport(payload);
				localError.value = "";
			} catch (error) {
				localError.value = error.message.startsWith("zx_")
					? error.message
					: "zx_builder_invalid_json";
			}
		}
		function trapFocus(event) {
			if (event.key === "Escape") {
				event.stopPropagation();
				close();
			}
			if (event.key !== "Tab") return;
			const focusable = [
				...dialog.value.querySelectorAll(
					'button, input, select, textarea, [tabindex="0"]',
				),
			].filter((item) => !item.disabled && item.offsetParent !== null);
			const first = focusable[0];
			const last = focusable.at(-1);
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			}
			if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		}
		onMounted(async () => {
			await nextTick();
			(
				dialog.value.querySelector(
					'input:not([type="file"]), textarea, .cm-content',
				) ?? dialog.value
			)?.focus();
		});
		onBeforeUnmount(() => previousFocus?.focus());
		return {
			...builder,
			dialog,
			componentText,
			addComponentJson,
			name,
			scope,
			format,
			selectedFile,
			localError,
			localErrorDetail,
			copied,
			importText,
			pendingImport,
			saving,
			title,
			jsFiles,
			exportText,
			close,
			submitName,
			deleteProject,
			confirmAction,
			copy,
			downloadJson,
			downloadJs,
			readFile,
			applyImport,
			importJson,
			trapFocus,
		};
	},
});
</script>
