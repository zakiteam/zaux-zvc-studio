<template>
	<div class="flex flex-col gap-1" role="group" :aria-label="label">
		<div class="mb-1 flex gap-0.5" role="group" :aria-label="translate('zx_builder_cta_mode')">
			<BuilderButton
				size="xs"
				:label="translate('zx_builder_cta_mode_form')"
				:aria-pressed="mode === 'form'"
				:variant="mode === 'form' ? 'primary' : 'secondary'"
				@click="setMode('form')"
			/>
			<BuilderButton
				size="xs"
				:label="translate('zx_builder_cta_mode_json')"
				:aria-pressed="mode === 'json'"
				:variant="mode === 'json' ? 'primary' : 'secondary'"
				@click="setMode('json')"
			/>
		</div>

		<div v-if="mode === 'form'" class="flex flex-col gap-1 rounded-xxs border-slim border-zaux-light p-2">
			<BuilderInput
				type="text"
				:label="translate('zx_builder_cta_label')"
				:placeholder="translate('zx_builder_cta_label')"
				:modelValue="cta.label ?? ''"
				:disabled="disabled"
				@change="set('label', $event.target.value)"
			/>
			<BuilderInput
				type="text"
				:label="translate('zx_builder_cta_href')"
				placeholder="#"
				:modelValue="cta.href ?? ''"
				:disabled="disabled"
				@change="set('href', $event.target.value)"
			/>
			<div class="grid grid-cols-2 gap-1">
				<BuilderInput
					type="select"
					:label="translate('zx_builder_cta_theme')"
					:options="themeOptions"
					:modelValue="cta.theme ?? ''"
					:disabled="disabled"
					@update:modelValue="set('theme', $event)"
				/>
				<BuilderInput
					type="select"
					:label="translate('zx_builder_cta_size')"
					:options="sizeOptions"
					:modelValue="cta.size ?? ''"
					:disabled="disabled"
					@update:modelValue="set('size', $event)"
				/>
			</div>
			<div class="grid grid-cols-2 gap-1">
				<BuilderIconPicker
					allowEmpty
					:label="translate('zx_builder_cta_icon')"
					:modelValue="cta.iconName ?? ''"
					@update:modelValue="setIcon('iconName', 'hasIcon', $event)"
				/>
				<BuilderIconPicker
					allowEmpty
					:label="translate('zx_builder_cta_action_icon')"
					:modelValue="cta.actionIconName ?? ''"
					@update:modelValue="setIcon('actionIconName', 'actionIcon', $event)"
				/>
			</div>
			<p v-if="extraKeys.length" class="text-[10px] text-zaux-dark-grey">
				{{ translate("zx_builder_cta_extra_keys", { keys: extraKeys.join(", ") }) }}
			</p>
			<div class="flex justify-end">
				<BuilderButton
					size="xs"
					variant="secondary"
					:label="translate('zx_builder_cta_clear')"
					:disabled="disabled || !Object.keys(cta).length"
					@click="emitValue({})"
				/>
			</div>
		</div>

		<template v-else>
			<BuilderCodeEditor
				v-model="jsonDraft"
				language="json"
				:label="label || translate('zx_builder_button')"
				:rows="6"
				:disabled="disabled"
				@change="applyJson"
			/>
			<p
				v-if="invalid"
				class="mt-1 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
			>
				{{ translate("zx_builder_invalid_json") }}
			</p>
		</template>
	</div>
</template>

<script>
	import { computed, defineComponent, ref, watch } from "vue";
	import { useTranslation } from "../../../composables/useTranslation.js";
	import { parseJson } from "../../../../domain/validation.js";
	import { isPlainRecord } from "../../../../domain/slider.js";
	import buttonMeta from "@zx_core/components/shared/button/ZButton.meta.js";

	// Keys edited by the form; any other ZButton prop in the object (tag, target,
	// rounded…) is kept as is and stays editable in JSON mode.
	const FORM_KEYS = ["label", "href", "theme", "size", "iconName", "actionIconName", "hasIcon", "actionIcon"];

	// Edits one CTA object (ZButton props), the single-button counterpart of
	// BuilderButtonGroupInput. Empty selects and fields remove their key, so the
	// ZButton default applies.
	export default defineComponent({
		name: "BuilderButtonInput",
		props: {
			label: { default: null },
			modelValue: { default: null },
			disabled: Boolean,
		},
		emits: ["update:modelValue"],
		setup(props, { emit }) {
			const { translate } = useTranslation();
			const mode = ref("form");
			const jsonDraft = ref("");
			const invalid = ref(false);
			const cta = computed(() => (isPlainRecord(props.modelValue) ? props.modelValue : {}));
			const extraKeys = computed(() => Object.keys(cta.value).filter((key) => !FORM_KEYS.includes(key)));
			const withDefault = (values) => [
				{ value: "", label: translate("zx_builder_cta_default") },
				...values.map((value) => ({ value, label: value })),
			];
			watch(
				() => props.modelValue,
				(value) => {
					jsonDraft.value = JSON.stringify(value ?? {}, null, 2);
					invalid.value = false;
				},
				{ immediate: true, deep: true },
			);
			function emitValue(value) {
				if (!props.disabled) emit("update:modelValue", value);
			}
			function set(key, value) {
				const next = { ...cta.value };
				if (value === "" || value == null) delete next[key];
				else next[key] = value;
				emitValue(next);
			}
			// ZButton renders an icon only with its flag, as the button group does.
			function setIcon(key, flag, value) {
				const next = { ...cta.value };
				if (value) {
					next[key] = value;
					next[flag] = true;
				} else {
					delete next[key];
					delete next[flag];
				}
				emitValue(next);
			}
			function setMode(next) {
				if (next === mode.value) return;
				jsonDraft.value = JSON.stringify(props.modelValue ?? {}, null, 2);
				invalid.value = false;
				mode.value = next;
			}
			function applyJson() {
				try {
					const parsed = parseJson(jsonDraft.value);
					if (!isPlainRecord(parsed)) throw new Error("zx_builder_invalid_json");
					invalid.value = false;
					emitValue(parsed);
				} catch {
					invalid.value = true;
				}
			}
			return {
				translate,
				mode,
				jsonDraft,
				invalid,
				cta,
				extraKeys,
				themeOptions: withDefault(buttonMeta.themes),
				sizeOptions: withDefault(buttonMeta.sizes),
				emitValue,
				set,
				setIcon,
				setMode,
				applyJson,
			};
		},
	});
</script>
