<template>
	<div class="zb-value">
		<BuilderImageInput v-if="image" :modelValue="modelValue" :label="label" :disabled="disabled" @update:modelValue="$emit('update:modelValue', $event)" />
		<BuilderButtonGroupInput 
			v-if="type === 'buttongroup'"
			:label="translate('zx_builder_buttongroup')"
			:modelValue="modelValue"
			@update:modelValue="$emit('update:modelValue', $event)"
		/>
		<BuilderInput
			v-else-if="type === 'switch'"
			type="select"
			:modelValue="String(modelValue)"
			:label="label"
			:options="[
				{ value: 'true', label: translate('zx_builder_yes') },
				{ value: 'false', label: translate('zx_builder_no') },
			]"
			@update:modelValue="$emit('update:modelValue', $event === 'true')"
		/>
		<BuilderInput
			v-else-if="type === 'select'"
			type="select"
			:modelValue="modelValue"
			:label="label"
			:options="options"
			@update:modelValue="$emit('update:modelValue', $event)"
		/>
		<template v-else-if="type === 'json' || type === 'css-editor'">
			<BuilderCodeEditor
				v-model="draft"
				:language="type === 'css-editor' ? 'css' : 'json'"
				:label="label"
				:rows="5"
				:disabled="disabled"
				@change="apply"
			/>
			<BuilderButton
				class="mt-2"
				size="xs"
				v-if="type === 'json'"
				icon="delete"
				:label="translate('zx_builder_clear_json')"
				:disabled="disabled"
				@click="clearJson"
			/>
		</template>
		<div v-else-if="type === 'textarea' || type === 'html'">
			<div
				class="mb-1 flex gap-0.5"
				role="group"
				:aria-label="translate('zx_builder_text_mode')"
			>
				<BuilderButton
					size="xs"
					:label="translate('zx_builder_text_source')"
					:aria-pressed="textMode === 'text'"
					:variant="textMode === 'text' ? 'primary' : 'secondary'"
					@click="textMode = 'text'"
					/>
					<BuilderButton
					size="xs"
					:label="translate('zx_builder_html_source')"
					:aria-pressed="textMode === 'html'"
					:variant="textMode === 'html' ? 'primary' : 'secondary'"
					@click="textMode = 'html'"
					/>
					<BuilderButton
					size="xs"
					:label="translate('zx_builder_richtext')"
					:aria-pressed="textMode === 'rich'"
					:variant="textMode === 'rich' ? 'primary' : 'secondary'"
					@click="textMode = 'rich'"
				/>
			</div>
			<BuilderRichTextEditor
				v-if="textMode === 'rich'"
				:modelValue="String(draft)"
				:label="label"
				:disabled="disabled"
				@update:modelValue="applyRichText"
			/>
			<div v-else-if="textMode === 'html'">
				<BuilderCodeEditor
					v-model="draft"
					language="html"
					:label="label"
					:rows="10"
					:disabled="disabled"
					@change="apply"
				/>
			</div>
			<textarea
				class="px-2 py-1"
				v-else
				v-model="draft"
				:aria-label="label"
				:disabled="disabled"
				rows="3"
				spellcheck="false"
				@change="apply"
			/>
			<p
				v-if="textMode === 'rich'"
				class="mt-1 text-[10px] leading-[1.5] text-zaux-dark-grey"
			>
				{{ translate("zx_builder_richtext_hint") }}
			</p>
		</div>
		<BuilderInput
			v-else
			v-model="draft"
			:type="type === 'number' ? 'number' : 'text'"
			:label="label"
			@change="apply"
		/>
		<p
			v-if="invalid"
			class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
		>
			{{ translate("zx_builder_invalid_json") }}
		</p>
	</div>
</template>
<script>
import {
	defineComponent,
	defineAsyncComponent,
	ref,
	watch,
} from "vue";
import { parseJson } from "../../../../domain/validation.js";
import { useTranslation } from "../../../composables/useTranslation.js";
import BuilderInput from "./BuilderInput.vue";
import BuilderImageInput from "./BuilderImageInput.vue";
import BuilderCodeEditor from "./BuilderCodeEditor.vue";
import BuilderButton from "../BuilderButton.vue";
import BuilderButtonGroupInput from "./BuilderButtonGroupInput.vue";
export default defineComponent({
	components: {
		BuilderInput,
		BuilderImageInput,
		BuilderCodeEditor,
		BuilderButton,
		BuilderButtonGroupInput,
		BuilderRichTextEditor: defineAsyncComponent(
			() => import("./BuilderRichTextEditor.vue"),
		),
	},
	props: {
		disabled: Boolean,
		image: Boolean,
		modelValue: { default: null },
		type: { default: "text" },
		label: String,
		options: { default: () => [] },
	},
	emits: ["update:modelValue"],
	setup(props, { emit }) {
		const draft = ref("");
		const invalid = ref(false);
		const textMode = ref("text");
		watch(
			() => [props.modelValue, props.type],
			() => {
				draft.value =
					props.type === "json"
						? JSON.stringify(props.modelValue ?? null, null, 2)
						: (props.modelValue ?? "");
				invalid.value = false;
			},
			{ immediate: true, deep: true },
		);
		function selectValue(event) {
			const option = props.options[event.target.selectedIndex];
			emit(
				"update:modelValue",
				option && typeof option === "object" ? option.value : option,
			);
		}
		function clearJson() {
			if (props.disabled) return;
			draft.value = Array.isArray(props.modelValue)
				? "[]"
				: props.modelValue && typeof props.modelValue === "object"
					? "{}"
					: "null";
			apply();
		}
		function applyRichText(value) {
			if (props.disabled) return;
			draft.value = value;
			apply();
		}
		function apply() {
			if (props.disabled) return;
			try {
				const value =
					props.type === "json"
						? parseJson(draft.value)
						: props.type === "number"
							? draft.value === ""
								? null
								: Number(draft.value)
							: draft.value;
				invalid.value = false;
				emit("update:modelValue", value);
			} catch {
				invalid.value = true;
			}
		}
		return {
			...useTranslation(),
			draft,
			invalid,
			textMode,
			applyRichText,
			apply,
			clearJson,
			selectValue,
		};
	},
});
</script>
