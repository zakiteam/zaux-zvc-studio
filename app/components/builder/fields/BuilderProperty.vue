<template>
	<div class="zb-property mb-2.5">
		<div
			class="zb-field-heading flex items-baseline justify-between gap-1 [&_label]:mb-1 [&_label]:text-[11px] [&_label]:font-medium [&>select]:w-[125px] [&>select]:border-none [&>select]:bg-transparent [&>select]:p-0.5 [&>select]:text-[9px] [&>select]:text-zaux-dark-grey"
		>
			<label :for="`prop-${encodeURIComponent(propertyPath)}`">{{
				propertyLabel
			}}</label
			><select
				:id="`prop-${encodeURIComponent(propertyPath)}`"
				:aria-label="`${translate('zx_builder_binding')}: ${propertyLabel}`"
				:value="isBinding(value) ? value.$bind : ''"
				@change="setBinding"
			>
				<option value="">{{ translate("zx_builder_literal") }}</option>
				<option v-for="field in fields" :key="field.key" :value="field.key">
					↗ {{ field.label }}
				</option>
			</select>
		</div>
		<p v-if="descriptor?.hintKey" class="mb-1 text-[10px] text-zaux-dark-grey">{{ translate(descriptor.hintKey) }}</p>
		<div
			v-if="isBinding(value)"
			class="zb-binding-pill rounded-xxs border-slim border-zaux-accent/20 bg-zaux-accent/5 p-1.5 font-mono text-[11px] text-zaux-accent"
		>
			↗ {{ value.$bind }}
		</div>
		<div
			v-else-if="descriptor?.media"
			class="border-l-slim border-zaux-light-grey pl-1.5"
		>
			<BuilderMediaInput
				:modelValue="value"
				:label="propertyLabel"
				@update:modelValue="$emit('change', $event)"
			/>
		</div>
		<div
			v-else-if="objectProperties"
			class="border-l-slim border-zaux-light-grey pl-1.5"
		>
			<BuilderProperty
				v-for="key in objectProperties"
				:key="key"
				:property="key"
				:path="`${propertyPath}.${key}`"
				:value="nestedValue(key)"
				:fields="fields"
				:descriptor="descriptor.properties[key] ?? {}"
				@change="changeNested(key, $event)"
			/>
			<details>
				<summary class="mb-1 text-[11px]">
					{{ translate("zx_builder_advanced") }}
				</summary>
				<BuilderValue
					:modelValue="value"
					:label="propertyLabel"
					type="json"
					@update:modelValue="$emit('change', $event)"
				/>
			</details>
		</div>
		<div
			v-else-if="arrayItems"
			class="border-l-slim border-zaux-light-grey pl-1.5"
		>
			<div v-for="(item, index) in value" :key="index" class="mb-2">
				<BuilderProperty
					:property="`${property} ${index + 1}`"
					:path="`${propertyPath}.${index}`"
					:value="item"
					:fields="fields"
					:descriptor="descriptor.items"
					@change="changeItem(index, $event)"
				/>
				<BuilderButton
					size="xs"
					icon="delete"
					:label="translate('zx_builder_delete')"
					@click="removeItem(index)"
				/>
			</div>
			<BuilderButton
				size="xs"
				icon="add"
				:label="translate('zx_builder_add')"
				@click="addItem"
			/>
		</div>
		<template v-else>
      <template v-if="descriptor?.control == 'buttongroup'">
          <BuilderValue
            :modelValue="value"
            :label="propertyLabel"
            :image="
              descriptor?.image && (value == null || typeof value === 'string')
            "
            type="buttongroup"
            @update:modelValue="$emit('change', $event)"
          />
      </template>
			<BuilderInput
				v-else-if="options.length"
				type="select"
				:modelValue="selectedOption"
				:label="propertyLabel"
				:options="selectOptions"
				@update:modelValue="selectOption"
			/>
			<BuilderValue
				v-else-if="!options.length || selectedOption === -1"
				:modelValue="value"
				:label="propertyLabel"
				:image="
					descriptor?.image && (value == null || typeof value === 'string')
				"
				:type="valueType"
				@update:modelValue="$emit('change', $event)"
			/>
		</template>
	</div>
</template>
<script>
import { defineComponent, computed, ref, watch } from "vue";
import { isBinding, clone } from "../../../../domain/nodes.js";
import { useTranslation } from "../../../composables/useTranslation.js";
import BuilderValue from "./BuilderValue.vue";
import BuilderInput from "./BuilderInput.vue";
import BuilderMediaInput from "./BuilderMediaInput.vue";
import BuilderButton from "../BuilderButton.vue";
import { propertyValueType } from "../../../../domain/properties.js";
export default defineComponent({
	name: "BuilderProperty",
	components: { BuilderValue, BuilderInput, BuilderMediaInput, BuilderButton },
	props: {
		property: String,
		path: String,
		value: { default: null },
		fields: Array,
		// Authored props without a descriptor (for example the id of the header and
		// footer presets) fall back to an empty descriptor, so the field still renders.
		descriptor: { type: Object, default: () => ({}) },
	},
	emits: ["change"],
	setup(props, { emit }) {
		const i18n = useTranslation();
		const custom = ref(false);
		const propertyLabel = computed(() => props.descriptor?.labelKey ? i18n.translate(props.descriptor.labelKey) : props.property);
		const propertyPath = computed(() => props.path ?? props.property);
		const objectProperties = computed(() =>
			props.descriptor?.properties &&
			props.value &&
			typeof props.value === "object" &&
			!Array.isArray(props.value)
				? [
						...new Set([
							...Object.keys(props.descriptor.properties),
							...Object.keys(props.value),
						]),
					]
				: null,
		);
		const arrayItems = computed(
			() => props.descriptor?.items && Array.isArray(props.value),
		);
		function nestedValue(key) {
			return Object.hasOwn(props.value, key)
				? props.value[key]
				: props.descriptor.properties[key]?.default;
		}
		function changeNested(key, value) {
			emit("change", { ...clone(props.value), [key]: clone(value) });
		}
		function changeItem(index, value) {
			const items = clone(props.value);
			items[index] = clone(value);
			emit("change", items);
		}
		function addItem() {
			emit("change", [
				...clone(props.value),
				clone(props.descriptor.items.default),
			]);
		}
		function removeItem(index) {
			emit(
				"change",
				props.value.filter((_, itemIndex) => itemIndex !== index).map(clone),
			);
		}

		const options = computed(() => props.descriptor?.options ?? []);
		const valueType = computed(() =>
			propertyValueType(props.property, props.value, props.descriptor),
		);
		const selectedOption = computed(() =>
			custom.value
				? -1
				: options.value.findIndex((option) =>
						Object.is(option.value, props.value),
					),
		);
		// Index values keep the custom entry separate from every possible property value.
		const selectOptions = computed(() => [
			...options.value.map((option, index) => ({
				value: index,
				label: option.labelKey ? i18n.translate(option.labelKey) : option.label,
			})),
			{ value: -1, label: i18n.translate("zx_builder_custom_value") },
		]);
		watch(
			() => props.value,
			() => {
				custom.value = false;
			},
		);
		function selectOption(index) {
			custom.value = index === -1;
			if (index !== -1) emit("change", clone(options.value[index].value));
		}
		function setBinding(event) {
			const key = event.target.value;
			if (key) emit("change", { $bind: key });
			else {
				const value = props.fields.find(
					(field) => field.key === props.value?.$bind,
				)?.default;
				emit("change", value === undefined ? "" : clone(value));
			}
		}
		return {
			...i18n,
			propertyPath,
			propertyLabel,
			objectProperties,
			arrayItems,
			nestedValue,
			changeNested,
			changeItem,
			addItem,
			removeItem,
			isBinding,
			valueType,
			options,
			selectOptions,
			selectedOption,
			selectOption,
			setBinding,
		};
	},
});
</script>
