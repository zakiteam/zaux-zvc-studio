<template>
	<BuilderModal
		:title="translate('zx_builder_global_publish_title')"
		:subtitle="definition?.name"
		size="sm"
		:busy="loading || busy"
		closeOnBackdrop
		@close="close"
	>
		<p v-if="loading" role="status" class="text-[12px] text-zaux-dark-grey">{{ translate("zx_builder_global_loading") }}</p>
		<div v-else-if="definition" class="space-y-2 text-[12px] leading-[1.6]">
			<p class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_global_publish_hint") }}</p>
			<dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-xs border-slim border-zaux-light-grey p-1.5 text-[11px]">
				<dt class="text-zaux-dark-grey">{{ translate("zx_builder_global_publish_kind") }}</dt>
				<dd class="font-mono">{{ (definition.kind ?? "zvc").toUpperCase() }}</dd>
				<dt class="text-zaux-dark-grey">{{ translate("zx_builder_global_publish_export") }}</dt>
				<dd class="break-all font-mono">{{ exportName }}</dd>
				<dt class="text-zaux-dark-grey">Zaux</dt>
				<dd class="font-mono">{{ zauxVersion }}</dd>
			</dl>
			<p v-if="exportName !== definition.exportName" class="rounded-xxs bg-utility-warning/15 p-1 text-[11px]">
				{{ translate("zx_builder_global_publish_renamed", { from: definition.exportName, to: exportName }) }}
			</p>
			<p v-if="sameName" class="rounded-xxs bg-utility-warning/15 p-1 text-[11px]">
				{{ translate("zx_builder_global_publish_same_name", { name: definition.name }) }}
			</p>
			<p v-if="partials" class="text-[11px] text-zaux-dark-grey">
				{{ translate("zx_builder_global_publish_partials", { count: partials }) }}
			</p>
			<label class="flex cursor-pointer items-start gap-1.5">
				<input v-model="link" type="checkbox" class="mt-0.5 !w-auto accent-zaux-accent" :disabled="busy" />
				<span>
					<strong class="font-semibold">{{ translate("zx_builder_global_publish_link") }}</strong>
					<span class="block text-[11px] text-zaux-dark-grey">{{ translate(link ? "zx_builder_global_publish_link_hint" : "zx_builder_global_publish_copy_hint") }}</span>
				</span>
			</label>
			<p class="rounded-xxs bg-zaux-light p-1 text-[11px]">{{ translate("zx_builder_global_publish_shared") }}</p>
			<p v-if="localError" role="alert" class="rounded-xxs bg-utility-error/10 p-1 text-[11px] text-utility-error">{{ translate(localError) }}</p>
			<p v-if="errorDetail" class="break-all font-mono text-[10px] text-zaux-dark-grey">{{ errorDetail }}</p>
		</div>
		<p v-else role="alert" class="text-[12px] text-utility-error">{{ translate("zx_builder_global_publish_invalid") }}</p>
		<template #footer>
			<BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_cancel')" :disabled="busy" @click="close" />
			<BuilderButton
				size="xs"
				variant="primary"
				icon="upload"
				:label="translate('zx_builder_global_publish')"
				:disabled="!canConfirm"
				@click="confirm"
			/>
		</template>
	</BuilderModal>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { listGlobalComponents } from "../../services/global-components.js";
import { globalExportName, isGlobalCandidate } from "../../../domain/global-components.js";
import { zauxProjectVersion } from "../../../integrations/zaux/version.js";

// Publication of a project ZVC/ZVP to the shared global library (modal { type: 'global-publish', id }).
// Reads the active global rows first to preview the export name the component will receive.
export default defineComponent({
	setup() {
		const builder = useBuilder();
		const modal = builder.modal.value;
		const definition = computed(() => {
			const item = builder.document.value.library.find((entry) => entry.id === modal.id);
			return isGlobalCandidate(item) ? item : null;
		});
		const rows = ref([]);
		const loading = ref(true);
		const busy = ref(false);
		const link = ref(true);
		const localError = ref("");
		const errorDetail = ref("");
		const exportName = computed(() => definition.value ? globalExportName(definition.value, rows.value) : "");
		const sameName = computed(() => rows.value.some((row) =>
			row.kind === (definition.value?.kind ?? "zvc") && row.name.trim().toLowerCase() === definition.value?.name.trim().toLowerCase()));
		const partials = computed(() => definition.value?.partials?.length ?? 0);
		const canConfirm = computed(() => !loading.value && !busy.value && !!definition.value && builder.canEditRemote.value);
		let disposed = false;
		onMounted(async () => {
			try {
				const result = await listGlobalComponents();
				if (!disposed) rows.value = result;
			} catch (exception) {
				if (!disposed) { localError.value = "zx_builder_global_load_error"; errorDetail.value = exception?.message ?? String(exception); }
			} finally {
				if (!disposed) loading.value = false;
			}
		});
		onBeforeUnmount(() => { disposed = true; });
		function close() { if (!busy.value) builder.modal.value = null; }
		async function confirm() {
			if (!canConfirm.value) return;
			const id = definition.value.id;
			localError.value = ""; errorDetail.value = "";
			busy.value = true;
			try {
				const { linked } = await builder.publishGlobalComponent(id, { link: link.value, rows: rows.value });
				// A linked copy is never edited in place: leave its library editor.
				if (linked && builder.mode.value === "library" && builder.libraryId.value === id) {
					const template = builder.activeTemplate.value ?? builder.document.value.templates[0];
					if (template) builder.selectTemplate(template.id);
					else builder.libraryId.value = null;
				}
				builder.libraryCategory.value = "global";
				busy.value = false;
				if (!disposed && builder.modal.value?.type === "global-publish") builder.modal.value = null;
			} catch (exception) {
				busy.value = false;
				const message = exception?.message ?? String(exception);
				if (message.startsWith("zx_")) localError.value = message;
				else { localError.value = "zx_builder_global_publish_error"; errorDetail.value = message; }
			}
		}
		return { translate: builder.translate, definition, loading, busy, link, localError, errorDetail, exportName, sameName, partials, zauxVersion: zauxProjectVersion, canConfirm, close, confirm };
	},
});
</script>
