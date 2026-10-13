<template>
	<template v-if="active && activeDefinition">
		<BuilderButton
			class="mb-2"
			size="xs"
			icon="download"
			:label="translate('zx_builder_export_zaux_json')"
			@click="openExport({ scope: 'component', format: 'runtime' })"
		/>
		<div
			class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
		>
			<label>{{ translate("zx_builder_export_name") }}</label
			><BuilderInput
				:readonly="isSource"
				:modelValue="activeDefinition.exportName"
				@change="
					updateDefinition((def) => {
						def.exportName = $event.target.value;
					})
				"
			/>
		</div>
		<div
			class="zb-segmented mb-1.5 flex rounded-xxs bg-zaux-light p-0.5 [&>button]:flex-1 [&>button]:rounded-xxs [&>button]:p-0.75 [&>button]:text-[10px] [&>button]:text-zaux-dark-grey [&>.active]:bg-zaux-white [&>.active]:text-zaux-accent"
		>
			<button
				:class="{ active: codeMode === 'compact' }"
				@click="codeMode = 'compact'"
			>
				JSON</button
			><button
				:class="{ active: codeMode === 'json' }"
				@click="codeMode = 'json'"
			>
				{{ translate("zx_builder_code_full_json") }}</button
			><button
				:class="{ active: codeMode === 'js' }"
				@click="codeMode = 'js'"
			>
				JavaScript</button
			><button
				:class="{ active: codeMode === 'css' }"
				@click="codeMode = 'css'"
			>
				CSS
			</button>
		</div>
		<template v-if="codeMode === 'compact'"
			><p
				class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
			>
				{{ translate("zx_builder_code_compact_hint") }}
			</p>
			<BuilderCodeEditor
				v-model="compactDraft"
				:readonly="isSource"
				rows="26"
				label="ZVC JSON" /><BuilderButton
				v-if="!isSource"
				:label="translate('zx_builder_apply')"
				@click="applyCompact"
		/></template>
		<template v-else-if="codeMode === 'json'"
			><BuilderCodeEditor
				v-model="definitionDraft"
				:readonly="isSource"
				rows="26"
				label="ZVC JSON" /><BuilderButton
				v-if="!isSource"
				:label="translate('zx_builder_apply')"
				@click="applyDefinition"
		/></template>
		<template v-else-if="codeMode === 'js'"
			><BuilderCodeEditor
				language="javascript"
				:modelValue="source"
				readonly
				rows="26"
				label="ZVC JavaScript" /><BuilderButton
				:label="translate('zx_builder_download_js')"
				@click="openExport({ scope: 'component', format: 'js' })"
		/></template>
		<template v-else
			><p
				class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
			>
				{{ translate("zx_builder_css_hint") }}
			</p>
			<BuilderCodeEditor
				:key="activeDefinition.id"
				:disabled="isSourceBase"
				:modelValue="activeDefinition.css"
				language="css"
				rows="22"
				label="CSS"
				@change="
					updateDefinition((def) => {
						def.css = $event;
					})
				"
		/></template>
	</template>
</template>
<script>
import { defineComponent, computed, ref, watch } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { parseJson, validateDefinition } from "../../../../domain/validation.js";
import { sourceCode } from "../../../services/source-zvc.js";
import { applyCompactDefinition, compactDefinition } from "../../../../domain/compact-definition.js";
import { findNode } from "../../../../domain/nodes.js";
export default defineComponent({
	props: { active: Boolean },
	emits: ["error"],
	setup(_props, { emit }) {
		const builder = useBuilder();
		const definitionDraft = ref("");
		const compactDraft = ref("");
		const codeMode = ref("compact");
		const source = computed(() =>
			builder.activeDefinition.value
				? sourceCode(builder.activeDefinition.value)
				: "",
		);
		watch(
			builder.activeDefinition,
			(value) => {
				definitionDraft.value = JSON.stringify(value ?? {}, null, 2);
				compactDraft.value = value
					? JSON.stringify(compactDefinition(value), null, 2)
					: "";
			},
			{ deep: true, immediate: true },
		);
		function reportError(exception) {
			emit("error", exception.message.startsWith("zx_")
				? exception.message
				: "zx_builder_invalid_json");
		}
		// Compact JSON carries no node ids: matching nodes keep theirs, so the
		// selection survives when the selected node is still in the tree.
		function applyCompact() {
			try {
				const { fields, tree } = applyCompactDefinition(
					builder.activeDefinition.value,
					parseJson(compactDraft.value),
				);
				const current = builder.activeDefinition.value;
				const unchanged = JSON.stringify({ fields, tree })
					=== JSON.stringify({ fields: current.fields, tree: current.tree });
				if (!unchanged) builder.updateDefinition((definition) =>
					Object.assign(definition, { fields, tree }),
				);
				if (!findNode(tree, builder.nodeId.value)) builder.nodeId.value = null;
				emit("error", "");
			} catch (exception) {
				reportError(exception);
			}
		}
		function applyDefinition() {
			try {
				const def = validateDefinition(parseJson(definitionDraft.value));
				builder.updateDefinition((current) =>
					Object.assign(current, { ...def, id: current.id }),
				);
				builder.nodeId.value = null;
				emit("error", "");
			} catch (exception) {
				reportError(exception);
			}
		}
		return { ...builder, definitionDraft, compactDraft, codeMode, source, applyDefinition, applyCompact };
	},
});
</script>
