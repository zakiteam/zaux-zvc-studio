<template>
	<div class="grid gap-2">
		<BuilderPartialFields
			v-if="partial && isPlainRecord(item.props)"
			:definition="partial"
			:reference="reference"
			:bindings="bindings"
			:modelValue="item.props"
			@change="update({ ...item, props: $event })"
		/>
		<template v-else-if="isPlainRecord(item.props ?? {})">
			<BuilderProperty
				v-for="property in itemProperties"
				:key="`${item.name}-${property}`"
				:property="property"
				:value="item.props[property]"
				:fields="bindings"
				:descriptor="descriptors[property]"
				removable
				@change="setProperty(property, $event)"
				@remove="removeProperty(property)"
			/>
			<div class="zb-field [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium">
				<label>{{ translate("zx_builder_add") }} · {{ translate("zx_builder_properties") }}</label>
				<BuilderInput
					type="select"
					modelValue=""
					:options="[
						{ value: '', label: '+' },
						...extraProperties.map((property) => ({ value: property, label: property })),
					]"
					@change="addProperty"
				/>
			</div>
		</template>
		<p v-else class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_slider_unknown") }}</p>
		<details v-if="json">
			<summary>{{ translate("zx_builder_advanced") }}</summary>
			<BuilderValue type="json" :modelValue="item" :label="label" @update:modelValue="update" />
		</details>
	</div>
</template>
<script>
	import { computed, defineComponent } from "vue";
	import { useBuilder } from "../../../../composables/useBuilder.js";
	import { useTranslation } from "../../../../composables/useTranslation.js";
	import { propertyInfo } from "../../../../services/catalog.js";
	import { propertyAddedValue } from "../../../../../domain/properties.js";
	import { isPlainRecord } from "../../../../../domain/slider.js";

	// Edits one { name, props } descriptor: ZVP partials through their fields,
	// catalog components through their property descriptors, both with raw JSON.
	export default defineComponent({
		name: "BuilderComponentItem",
		props: {
			item: { type: Object, required: true },
			label: String,
			bindings: { type: Array, default: () => [] },
			// Document object of this occurrence; enables partial variant/restore actions.
			reference: { type: Object, default: null },
			// Hide the item JSON when the parent already edits the whole value as JSON.
			json: { type: Boolean, default: true },
		},
		emits: ["change"],
		setup(props, { emit }) {
			const { translate } = useTranslation();
			const builder = useBuilder();
			const partial = computed(() =>
				builder.availablePartials.value.find((entry) => entry.exportName === props.item?.name),
			);
			const descriptors = computed(() => {
				const trees = builder.mode.value === "library"
					? [builder.activeDefinition.value?.tree ?? []]
					: (builder.activeTemplate.value?.instances ?? []).map((instance) => instance.definition.tree);
				return props.item?.name ? propertyInfo(props.item.name, { props: props.item.props ?? {}, trees }) : {};
			});
			const itemProperties = computed(() => Object.keys(props.item?.props ?? {}));
			const extraProperties = computed(() =>
				Object.keys(descriptors.value).filter((key) => !Object.hasOwn(props.item?.props ?? {}, key)).sort(),
			);
			function update(item) {
				if (isPlainRecord(item)) emit("change", item);
			}
			function setProperty(key, value) {
				update({ ...props.item, props: { ...props.item.props, [key]: value } });
			}
			function removeProperty(key) {
				const { [key]: _removed, ...rest } = props.item.props;
				update({ ...props.item, props: rest });
			}
			function addProperty(event) {
				const key = event.target.value;
				if (!key) return;
				setProperty(key, propertyAddedValue(descriptors.value[key]));
				event.target.value = "";
			}
			return { translate, partial, descriptors, itemProperties, extraProperties, isPlainRecord, update, setProperty, removeProperty, addProperty };
		},
	});
</script>
