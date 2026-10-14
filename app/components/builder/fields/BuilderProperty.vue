<template>
	<div class="zb-property min-w-0 mb-2.5" :data-zb-property="propertyPath">
		<div
			class="zb-field-heading flex flex-wrap items-baseline justify-between gap-1 [&_label]:min-w-0 [&_label]:[overflow-wrap:anywhere] [&_label]:mb-1 [&_label]:text-[11px] [&_label]:font-medium [&_select]:max-w-full [&_select]:w-[125px] [&_select]:border-none [&_select]:bg-transparent [&_select]:p-0.5 [&_select]:text-[9px] [&_select]:text-zaux-dark-grey"
		>
			<label :for="`prop-${encodeURIComponent(propertyPath)}`" :title="descriptor?.labelKey ? property : undefined">{{
				propertyLabel
			}}<code v-if="value === null" class="ml-0.5 rounded-xxs bg-zaux-light px-0.5 font-mono text-[9px] font-normal text-zaux-dark-grey">null</code></label
			><span class="ml-auto flex items-center gap-0.5"
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
			</select
			><BuilderDropdown
				:label="`${translate('zx_builder_prop_actions')}: ${propertyLabel}`"
				:items="actionItems"
				align="end"
				@select="runAction"
			>
				<template #trigger="{ open, menuId }">
					<button
						type="button"
						class="grid h-[18px] w-[18px] place-items-center rounded-xxs text-zaux-dark-grey hover:bg-zaux-light hover:text-zaux-dark"
						:class="open ? 'bg-zaux-light text-zaux-dark' : ''"
						:title="translate('zx_builder_prop_actions')"
						:aria-label="`${translate('zx_builder_prop_actions')}: ${propertyLabel}`"
						:aria-expanded="open"
						aria-haspopup="menu"
						:aria-controls="menuId"
					>
						<svg class="h-[12px] w-[12px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'more-vertical')" /></svg>
					</button>
				</template>
			</BuilderDropdown></span>
		</div>
		<p v-if="descriptor?.hintKey" class="mb-1 text-[10px] text-zaux-dark-grey">{{ translate(descriptor.hintKey) }}</p>
		<p v-if="overriddenBy" class="mb-1 text-[10px] text-zaux-accent">↗ {{ translate("zx_builder_props_binding_overridden", { field: overriddenBy }) }}</p>
		<div
			v-if="isBinding(value)"
			class="zb-binding-pill rounded-xxs border-slim border-zaux-accent/20 bg-zaux-accent/5 p-1.5 font-mono text-[11px] text-zaux-accent"
		>
			↗ {{ value.$bind }}
		</div>
		<!-- An explicit null is a value of its own (Zaux often reads it as "theme default"); editors that
		     treat null as empty (selects with a null choice, class and icon pickers) keep their field. -->
		<div
			v-else-if="nullState"
			class="flex items-center gap-1 rounded-xxs border-slim border-dashed border-zaux-light-grey px-1.5 py-1"
		>
			<span class="min-w-0 flex-1 text-[10px] leading-[1.4] text-zaux-dark-grey">{{ translate("zx_builder_prop_null_hint") }}</span>
			<BuilderButton
				size="xs"
				variant="light"
				icon="edit"
				:label="translate('zx_builder_prop_set_value')"
				@click="assignValue"
			/>
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
			v-else-if="descriptor?.control === 'component'"
			class="border-l-slim border-zaux-light-grey pl-1.5"
		>
			<BuilderComponentInput
				:modelValue="value"
				:label="propertyLabel"
				@update:modelValue="changeComponent"
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
				:removable="Object.hasOwn(value, key)"
				@change="changeNested(key, $event)"
				@remove="removeNested(key)"
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
			<BuilderIconPicker
				v-else-if="descriptor?.control === 'icon' && (value == null || typeof value === 'string')"
				:modelValue="value ?? ''"
				:label="propertyLabel"
				:icons="options.length ? options.map(option => option.value) : null"
				:allowEmpty="!!descriptor.allowEmpty"
				@update:modelValue="$emit('change', $event)"
			/>
			<template v-else-if="options.length">
				<BuilderInput
					type="select"
					:modelValue="selectedOption"
					:label="propertyLabel"
					:options="selectOptions"
					@update:modelValue="selectOption"
				/>
				<!-- "Custom value", or a stored value outside the list, keeps its typed editor. -->
				<BuilderValue
					v-if="selectedOption === -1"
					class="mt-1"
					:modelValue="value"
					:label="propertyLabel"
					:type="valueType"
					@update:modelValue="$emit('change', $event)"
				/>
			</template>
			<BuilderValue
				v-else
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
import { propertyValueType, propertyInitialValue } from "../../../../domain/properties.js";
import { useBuilder } from "../../../composables/useBuilder.js";
import { iconHref } from "@integration/options/icon-options.js";
export default defineComponent({
	name: "BuilderProperty",
	props: {
		property: String,
		path: String,
		value: { default: null },
		fields: Array,
		// Authored props without a descriptor (for example the id of the header and
		// footer presets) fall back to an empty descriptor, so the field still renders.
		descriptor: { type: Object, default: () => ({}) },
		// The parent can delete this key (the component default applies again): emits `remove`.
		removable: Boolean,
		// Label of the field bound to the whole component that currently overrides this prop.
		overriddenBy: { type: String, default: "" },
	},
	emits: ["change", "remove"],
	setup(props, { emit }) {
		const i18n = useTranslation();
		const iconSet = useBuilder()?.iconSet;
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
		function removeNested(key) {
			const { [key]: _removed, ...rest } = clone(props.value);
			emit("change", rest);
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
		// Editors that already show null as an empty or selectable state keep their field.
		const nullState = computed(() =>
			props.value === null &&
			!options.value.some((option) => option.value === null) &&
			!["classes", "icon", "component"].includes(props.descriptor?.control),
		);
		const actionItems = computed(() => [
			{ id: "null", label: i18n.translate("zx_builder_prop_set_null"), icon: "remove", disabled: props.value === null },
			...(nullState.value ? [{ id: "value", label: i18n.translate("zx_builder_prop_set_value"), icon: "edit" }] : []),
			...(props.removable ? [{ id: "remove", label: i18n.translate("zx_builder_prop_reset"), icon: "refresh", danger: true }] : []),
		]);
		function assignValue() {
			emit("change", propertyInitialValue(props.descriptor, { notNull: true }));
		}
		function runAction(item) {
			if (item.id === "null") emit("change", null);
			else if (item.id === "value") assignValue();
			else if (item.id === "remove") emit("remove");
		}
		// An emptied component prop goes back to null (no content) rather than `{}`.
		function changeComponent(value) {
			const empty = value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length;
			emit("change", empty ? null : value);
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
			removeNested,
			nullState,
			actionItems,
			assignValue,
			runAction,
			iconSet,
			iconHref,
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
			changeComponent,
		};
	},
});
</script>
