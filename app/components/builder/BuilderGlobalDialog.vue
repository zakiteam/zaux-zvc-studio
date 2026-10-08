<template>
	<BuilderModal
		:title="translate(sync ? 'zx_builder_global_sync_title' : 'zx_builder_global_import_title')"
		:subtitle="name"
		size="sm"
		:busy="loading"
		closeOnBackdrop
		@close="close"
	>
		<p v-if="loading" role="status" class="text-[12px] text-zaux-dark-grey">{{ translate("zx_builder_global_loading") }}</p>
		<div v-else class="space-y-2 text-[12px] leading-[1.6]">
			<p class="text-[11px] text-zaux-dark-grey">
				{{ translate(sync ? (instance ? "zx_builder_global_sync_scope_instance" : "zx_builder_global_sync_scope_all") : "zx_builder_global_import_hint", { name: instance?.name ?? name }) }}
			</p>

			<!-- Sync: optional pull of the latest global revision, then the reset type. -->
			<template v-if="sync">
				<label v-if="row && updateAvailable" class="flex cursor-pointer items-start gap-1.5">
					<input v-model="pull" type="checkbox" class="mt-0.5 !w-auto accent-zaux-accent" />
					<span>{{ translate("zx_builder_global_pull", { from: linked?.global.revision, to: row.revision }) }}</span>
				</label>
				<p v-else-if="row" class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_global_up_to_date", { revision: linked?.global.revision ?? row.revision }) }}</p>
				<p v-else class="rounded-xxs bg-utility-warning/15 p-1 text-[11px]">{{ translate("zx_builder_global_unavailable") }}</p>
				<fieldset class="m-0 space-y-1 border-none p-0">
					<legend class="mb-0.5 text-[11px] font-semibold">{{ translate("zx_builder_global_reset_mode") }}</legend>
					<label v-for="option in resetOptions" :key="option.value" class="flex cursor-pointer items-start gap-1.5">
						<input v-model="reset" type="radio" name="zb-global-reset" :value="option.value" class="mt-0.5 !w-auto accent-zaux-accent" />
						<span><strong class="font-semibold">{{ translate(option.label) }}</strong><span class="block text-[11px] text-zaux-dark-grey">{{ translate(option.hint) }}</span></span>
					</label>
				</fieldset>
			</template>

			<!-- Zaux version check: required before any global content enters the project. -->
			<section v-if="checkVersion" class="rounded-xs border-slim border-zaux-light-grey p-1.5" :aria-label="translate('zx_builder_global_version_check')">
				<h3 class="mb-0.5 text-[11px] font-semibold">{{ translate("zx_builder_global_version_check") }}</h3>
				<p class="font-mono text-[11px]">{{ translate("zx_builder_global_version_component", { version: compatibility.component || "?" }) }}</p>
				<p class="font-mono text-[11px]">{{ translate("zx_builder_global_version_running", { version: compatibility.builder }) }}</p>
				<p class="font-mono text-[11px]">{{ translate("zx_builder_zaux_version_project_edited", { version: compatibility.project || translate("zx_builder_zaux_version_unknown") }) }}</p>
				<p class="mt-1 rounded-xxs p-1 text-[11px]" :class="compatibility.match ? 'bg-utility-success/15' : 'bg-utility-warning/20'" role="status">
					{{ translate(compatibility.match ? "zx_builder_global_version_match" : "zx_builder_global_version_mismatch") }}
				</p>
				<label v-if="!compatibility.match" class="mt-1 flex cursor-pointer items-start gap-1.5 text-[11px] font-semibold">
					<input v-model="accepted" type="checkbox" class="mt-0.5 !w-auto accent-zaux-accent" />
					<span>{{ translate("zx_builder_global_accept_risk") }}</span>
				</label>
			</section>

			<p v-if="localError" role="alert" class="rounded-xxs bg-utility-error/10 p-1 text-[11px] text-utility-error">{{ translate(localError) }}</p>
			<p v-if="errorDetail" class="break-all font-mono text-[10px] text-zaux-dark-grey">{{ errorDetail }}</p>
		</div>
		<template #footer>
			<BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_cancel')" @click="close" />
			<BuilderButton
				size="xs"
				variant="primary"
				:label="translate(sync ? 'zx_builder_global_sync' : modal.insert ? 'zx_builder_global_import_insert' : 'zx_builder_global_import')"
				:disabled="!canConfirm"
				@click="confirm"
			/>
		</template>
	</BuilderModal>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { getGlobalComponent } from "../../services/global-components.js";
import { globalUpdateAvailable } from "../../../domain/global-components.js";

// Import of a global ZVC/ZVP (modal { type: 'global-import', id, insert }) and Soft/Hard reset of its
// project instances (modal { type: 'global-sync', id, instanceId?, reset }). Both always read the
// latest row and require explicit approval when its Zaux signature differs from the running release
// or from the release of the project's last edit.
export default defineComponent({
	setup() {
		const builder = useBuilder();
		const modal = builder.modal.value;
		const sync = modal.type === "global-sync";
		const row = ref(null);
		const loading = ref(true);
		const localError = ref("");
		// Raw failure text (Supabase or validation), shown under the translated message.
		const errorDetail = ref("");
		const pull = ref(false);
		const accepted = ref(false);
		const reset = ref(["soft", "hard", "none"].includes(modal.reset) ? modal.reset : "soft");
		const linked = computed(() => builder.document.value.library.find((item) => item.id === modal.id && item.global));
		const instance = computed(() => modal.instanceId ? builder.document.value.templates.flatMap((template) => template.instances).find((item) => item.id === modal.instanceId) : null);
		const name = computed(() => linked.value?.name ?? row.value?.name ?? "");
		const updateAvailable = computed(() => globalUpdateAvailable(linked.value, row.value));
		const resetOptions = computed(() => [
			{ value: "soft", label: "zx_builder_restore_library", hint: "zx_builder_soft_reset_hint" },
			{ value: "hard", label: "zx_builder_reset_instance", hint: "zx_builder_hard_reset_hint" },
			...(instance.value ? [] : [{ value: "none", label: "zx_builder_global_reset_none", hint: "zx_builder_global_reset_none_hint" }]),
		]);
		const checkVersion = computed(() => Boolean(row.value) && (!sync || pull.value));
		const compatibility = computed(() => builder.globalVersionCheck(row.value?.zaux_version));
		const canConfirm = computed(() => {
			if (loading.value || !builder.canEditRemote.value) return false;
			if (checkVersion.value && !compatibility.value.match && !accepted.value) return false;
			if (!sync) return Boolean(row.value);
			if (!linked.value) return false;
			return pull.value || reset.value !== "none";
		});
		let disposed = false;
		onMounted(async () => {
			try {
				const result = await getGlobalComponent(modal.id);
				if (disposed) return;
				row.value = result && !result.archived_at ? result : null;
				if (!row.value && !sync) localError.value = "zx_builder_global_missing";
				pull.value = sync && updateAvailable.value;
			} catch (exception) {
				if (!disposed) { localError.value = "zx_builder_global_load_error"; errorDetail.value = exception?.message ?? String(exception); }
			} finally {
				if (!disposed) loading.value = false;
			}
		});
		onBeforeUnmount(() => { disposed = true; });
		function close() { builder.modal.value = null; }
		function confirm() {
			if (!canConfirm.value) return;
			localError.value = ""; errorDetail.value = "";
			let done = false;
			try {
				done = sync
				? builder.syncGlobalComponent(modal.id, { row: pull.value ? row.value : null, instance: modal.instanceId ?? null, reset: reset.value })
				: builder.importGlobalComponent(row.value, { insert: modal.insert ?? false });
			} catch (exception) { errorDetail.value = exception?.message ?? String(exception); }
			if (!done) {
				const message = builder.error.value || "zx_builder_global_missing";
				if (message.startsWith("zx_")) localError.value = message;
				else { localError.value = "zx_builder_global_insert_error"; errorDetail.value ||= message; }
				return;
			}
			if (builder.modal.value?.type === modal.type) close();
		}
		return { translate: builder.translate, modal, sync, row, loading, localError, errorDetail, pull, accepted, reset, linked, instance, name, updateAvailable, resetOptions, checkVersion, compatibility, canConfirm, close, confirm };
	},
});
</script>
