<template>
	<BuilderModal
		:title="translate('zx_builder_zaux_version_title')"
		:subtitle="project ? document.name : linked?.name"
		size="sm"
		:busy="project"
		:closeOnBackdrop="!project"
		@close="cancel"
	>
		<div class="space-y-2 text-[12px] leading-[1.6]">
			<p class="text-[11px] text-zaux-dark-grey">
				{{ translate(project ? "zx_builder_zaux_version_project_hint" : "zx_builder_zaux_version_global_hint", { name: linked?.name ?? "" }) }}
			</p>
			<section class="rounded-xs border-slim border-zaux-light-grey p-1.5" :aria-label="translate('zx_builder_global_version_check')">
				<h3 class="mb-0.5 text-[11px] font-semibold">{{ translate("zx_builder_global_version_check") }}</h3>
				<template v-if="project">
					<p class="font-mono text-[11px]">{{ translate("zx_builder_zaux_version_project_created", { version: modal.created || unknown }) }}</p>
					<p class="font-mono text-[11px]">{{ translate("zx_builder_zaux_version_project_edited", { version: modal.edited || unknown }) }}</p>
				</template>
				<template v-else>
					<p class="font-mono text-[11px]">{{ translate("zx_builder_global_version_component", { version: check?.component || unknown }) }}</p>
					<p class="font-mono text-[11px]">{{ translate("zx_builder_zaux_version_project_edited", { version: check?.project || unknown }) }}</p>
				</template>
				<p class="font-mono text-[11px]">{{ translate("zx_builder_global_version_running", { version: running }) }}</p>
				<p class="mt-1 rounded-xxs bg-utility-warning/20 p-1 text-[11px]" role="status">
					{{ translate(project ? "zx_builder_zaux_version_project_mismatch" : "zx_builder_global_version_mismatch") }}
				</p>
				<label class="mt-1 flex cursor-pointer items-start gap-1.5 text-[11px] font-semibold">
					<input v-model="accepted" type="checkbox" class="mt-0.5 !w-auto accent-zaux-accent" />
					<span>{{ translate("zx_builder_global_accept_risk") }}</span>
				</label>
			</section>
			<p v-if="localError" role="alert" class="rounded-xxs bg-utility-error/10 p-1 text-[11px] text-utility-error">{{ translate(localError) }}</p>
		</div>
		<template #footer>
			<BuilderButton size="xs" variant="alt1" :label="translate(project ? 'zx_builder_hub_back' : 'zx_builder_cancel')" @click="cancel" />
			<BuilderButton size="xs" variant="primary" :label="translate('zx_builder_zaux_version_continue')" :disabled="!accepted" @click="confirm" />
		</template>
	</BuilderModal>
</template>
<script>
import { computed, defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { useBuilder } from "../../composables/useBuilder.js";
import { zauxProjectVersion } from "../../../integrations/zaux/version.js";

// Zaux release mismatch approval (modal { type: 'zaux-version' }).
// scope 'project': opening a project last edited with another release; declining returns to the hub.
// scope 'global': inserting a linked global copy whose signature differs ({ id, insert }).
export default defineComponent({
	setup() {
		const builder = useBuilder();
		const router = useRouter();
		const modal = builder.modal.value;
		const project = modal.scope === "project";
		const accepted = ref(false);
		const localError = ref("");
		const linked = computed(() => project ? null : builder.document.value.library.find((item) => item.id === modal.id && item.global));
		const check = computed(() => linked.value ? builder.globalVersionCheck(linked.value.global.zauxVersion) : null);
		const unknown = computed(() => builder.translate("zx_builder_zaux_version_unknown"));
		function cancel() {
			// The project stays closed until the user approves: leaving goes back to the hub.
			if (project) router.push("/");
			else builder.modal.value = null;
		}
		function confirm() {
			if (!accepted.value) return;
			if (project) { builder.acceptProjectZauxVersion(); return; }
			if (!builder.insertApprovedGlobal(modal.id, modal.insert)) localError.value = builder.error.value?.startsWith("zx_") ? builder.error.value : "zx_builder_global_insert_error";
		}
		return { translate: builder.translate, document: builder.document, modal, project, accepted, localError, linked, check, unknown, running: zauxProjectVersion, cancel, confirm };
	},
});
</script>
