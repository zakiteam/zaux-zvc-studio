<template>
	<template v-if="active && activeDefinition">
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
				:class="{ active: codeMode === 'json' }"
				@click="codeMode = 'json'"
			>
				JSON</button
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
		<template v-if="codeMode === 'json'"
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
				@click="modal = { type: 'export', scope: 'component' }"
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
import BuilderInput from "../fields/BuilderInput.vue";
import BuilderCodeEditor from "../fields/BuilderCodeEditor.vue";
import BuilderButton from "../BuilderButton.vue";
export default defineComponent({
	components: { BuilderInput, BuilderCodeEditor, BuilderButton },
	props: { active: Boolean },
	emits: ["error"],
	setup(_props, { emit }) {
		const builder = useBuilder();
		const definitionDraft = ref("");
		const codeMode = ref("json");
		const source = computed(() =>
			builder.activeDefinition.value
				? sourceCode(builder.activeDefinition.value)
				: "",
		);
		watch(
			builder.activeDefinition,
			(value) => {
				definitionDraft.value = JSON.stringify(value ?? {}, null, 2);
			},
			{ deep: true, immediate: true },
		);
		function applyDefinition() {
			try {
				const def = validateDefinition(parseJson(definitionDraft.value));
				builder.updateDefinition((current) =>
					Object.assign(current, { ...def, id: current.id }),
				);
				builder.nodeId.value = null;
				emit("error", "");
			} catch (exception) {
				emit("error", exception.message.startsWith("zx_")
					? exception.message
					: "zx_builder_invalid_json");
			}
		}
		return { ...builder, definitionDraft, codeMode, source, applyDefinition };
	},
});
</script>
