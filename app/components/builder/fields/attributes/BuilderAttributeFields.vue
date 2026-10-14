<template>
	<div ref="root" class="grid gap-1.5">
		<div
			v-for="key in keys"
			:key="key"
			:data-zb-attribute="key"
			class="grid gap-0.5"
			:class="stacked(key) ? '' : 'grid-cols-[minmax(0,96px)_minmax(0,1fr)_auto] items-center gap-1'"
		>
			<div :class="stacked(key) ? 'flex min-w-0 items-center gap-1' : 'contents'">
				<code
					class="min-w-0 truncate font-mono text-[10px] text-zaux-dark"
					:class="stacked(key) ? 'flex-1' : ''"
					:title="key"
				>{{ key }}</code>
				<BuilderButton
					v-if="stacked(key)"
					variant="light"
					size="xs"
					icon="close"
					iconOnly
					:label="translate('zx_builder_attribute_remove', { name: key })"
					:disabled="disabled"
					@click="remove(key)"
				/>
			</div>
			<BuilderStyleInput
				v-if="key === 'class' && (modelValue[key] == null || typeof modelValue[key] === 'string')"
				:modelValue="modelValue[key] ?? ''"
				:label="`${label} · ${key}`"
				:disabled="disabled"
				@update:modelValue="set(key, $event)"
			/>
			<BuilderValue
				v-else-if="typeof modelValue[key] !== 'string'"
				:modelValue="modelValue[key]"
				:label="`${label} · ${key}`"
				:type="valueType(key)"
				:disabled="disabled"
				@update:modelValue="set(key, $event)"
			/>
			<input
				v-else
				type="text"
				class="px-1.5 py-0.75 bg-zaux-light border-none text-[11px]"
				:value="modelValue[key]"
				:aria-label="`${label} · ${key}`"
				:disabled="disabled"
				spellcheck="false"
				@change="set(key, $event.target.value)"
			/>
			<BuilderButton
				v-if="!stacked(key)"
				variant="light"
				size="xs"
				icon="close"
				iconOnly
				:label="translate('zx_builder_attribute_remove', { name: key })"
				:disabled="disabled"
				@click="remove(key)"
			/>
		</div>
		<p v-if="!keys.length" class="text-[10px] text-zaux-dark-grey">{{ translate("zx_builder_attribute_empty") }}</p>
		<div v-if="quickSuggestions.length" class="flex flex-wrap gap-0.5" role="group" :aria-label="translate('zx_builder_attribute_suggestions')">
			<button
				v-for="name in quickSuggestions"
				:key="name"
				type="button"
				class="rounded-xxs bg-zaux-light px-1 py-0.25 font-mono text-[10px] text-zaux-dark-grey hover:bg-zaux-accent/10 hover:text-zaux-accent"
				:disabled="disabled"
				:title="translate('zx_builder_attribute_add_named', { name })"
				@click="addSuggestion(name)"
			>+ {{ name }}{{ name.endsWith('-') ? '…' : '' }}</button>
		</div>
		<div class="flex items-center gap-1">
			<input
				ref="nameInput"
				v-model="draftName"
				type="text"
				class="flex-1 px-1.5 py-0.75 font-mono text-[11px] bg-zaux-light border-none"
				:list="listId"
				:placeholder="translate('zx_builder_attribute_name_placeholder')"
				:aria-label="translate('zx_builder_attribute_name')"
				:aria-invalid="!!error"
				:disabled="disabled"
				autocomplete="off"
				spellcheck="false"
				@keydown.enter.prevent="add"
				@input="error = ''"
			/>
			<datalist :id="listId">
				<option v-for="name in remainingSuggestions" :key="name" :value="name" />
			</datalist>
			<BuilderButton
				size="xs"
				icon="add"
				iconOnly
				:label="translate('zx_builder_attribute_add')"
				:disabled="disabled || !draftName.trim()"
				@click="add"
			/>
		</div>
		<p v-if="error" class="rounded-xxs bg-utility-error/10 p-1 text-[10px] text-utility-error" role="alert">{{ translate(error) }}</p>
	</div>
</template>
<script>
	import { computed, defineComponent, nextTick, ref, useId } from "vue";
	import { useTranslation } from "../../../../composables/useTranslation.js";
	import { propertyValueType } from "../../../../../domain/properties.js";

	// HTML attribute names, including data-*, aria-* and namespaced ones (xlink:href).
	const ATTRIBUTE_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/;

	// Edits one plain object of HTML attributes (class, id, data-*, aria-*…).
	// String values use a text field; other JSON values keep their type.
	export default defineComponent({
		name: "BuilderAttributeFields",
		props: {
			modelValue: { type: Object, default: () => ({}) },
			suggestions: { type: Array, default: () => [] },
			label: { type: String, default: "" },
			disabled: Boolean,
		},
		emits: ["update:modelValue"],
		setup(props, { emit }) {
			const { translate } = useTranslation();
			const root = ref(null);
			const nameInput = ref(null);
			const draftName = ref("");
			const error = ref("");
			const listId = useId();
			const keys = computed(() => Object.keys(props.modelValue ?? {}));
			const remainingSuggestions = computed(() => props.suggestions.filter((name) => !keys.value.includes(name)));
			const quickSuggestions = computed(() => remainingSuggestions.value.slice(0, 6));
			// Class lists and non-text values get a full-width editor under the name.
			function stacked(key) {
				const value = props.modelValue[key];
				return key === "class" || (typeof value !== "string" && value !== undefined);
			}
			function valueType(key) {
				return propertyValueType(key, props.modelValue[key]);
			}
			function set(key, value) {
				emit("update:modelValue", { ...props.modelValue, [key]: value });
			}
			function remove(key) {
				const { [key]: _removed, ...rest } = props.modelValue;
				emit("update:modelValue", rest);
			}
			async function focusAttribute(name) {
				await nextTick();
				root.value?.querySelector(`[data-zb-attribute="${CSS.escape(name)}"] input, [data-zb-attribute="${CSS.escape(name)}"] textarea`)?.focus();
			}
			function create(name) {
				if (!ATTRIBUTE_NAME.test(name) || name.endsWith("-")) {
					error.value = "zx_builder_attribute_invalid";
					return false;
				}
				if (keys.value.includes(name)) {
					error.value = "zx_builder_attribute_exists";
					return false;
				}
				error.value = "";
				set(name, "");
				focusAttribute(name);
				return true;
			}
			function add() {
				const name = draftName.value.trim();
				if (name && create(name)) draftName.value = "";
			}
			// Prefix suggestions (data-) prefill the name field; complete names are added at once.
			function addSuggestion(name) {
				if (name.endsWith("-")) {
					draftName.value = name;
					nameInput.value?.focus();
					return;
				}
				create(name);
			}
			return {
				translate, root, nameInput, draftName, error, listId, keys, remainingSuggestions, quickSuggestions,
				stacked, valueType, set, remove, add, addSuggestion,
			};
		},
	});
</script>
