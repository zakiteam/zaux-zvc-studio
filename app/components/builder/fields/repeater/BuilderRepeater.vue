<template>
	<fieldset
		:disabled="!canEditRemote || isSource"
		class="zb-repeater mb-2.5 grid min-w-0 gap-1.5 rounded-xxs border-slim p-1.5"
		:class="repeaters.length ? 'border-zaux-accent/20 bg-zaux-accent/5' : 'border-dashed border-zaux-light-grey'"
	>
		<p class="text-[11px] font-medium">{{ translate("zx_builder_repeater") }}</p>

		<div v-for="item in repeaters" :key="item.prop" class="grid min-w-0 gap-1">
			<p class="text-[10px] leading-[1.5] text-zaux-dark-grey">
				{{ translate("zx_builder_repeater_bound", { prop: item.prop, field: item.field.label || item.field.key, key: item.field.key }) }}
				<template v-if="allowedOf(item.field)"> · {{ translate("zx_builder_repeater_allowed_list", { names: allowedOf(item.field).join(", ") }) }}</template>
			</p>
			<BuilderComponentInput
				:modelValue="valueOf(item.field)"
				:label="item.field.label || item.field.key"
				:allowed="allowedOf(item.field)"
				:disabled="!canEditRemote || isSource"
				@update:modelValue="setValue(item.field, $event)"
			/>
		</div>

		<!-- An unbound Repeater keeps literal entries (edited in the property list); a field makes them editable data. -->
		<form v-if="repeaterNode && !repeaters.length && canCreate" class="grid gap-1" @submit.prevent="create">
			<p class="text-[10px] leading-[1.5] text-zaux-dark-grey">{{ translate("zx_builder_repeater_literal_hint") }}</p>
			<div class="grid grid-cols-2 gap-1 [&>*]:min-w-0">
				<BuilderInput
					:id="`repeater-${node.id}-key`"
					:modelValue="draft.key"
					:label="translate('zx_builder_field_key')"
					:placeholder="translate('zx_builder_field_key')"
					required
					@update:modelValue="draft.key = $event"
				/>
				<BuilderInput
					:id="`repeater-${node.id}-label`"
					:modelValue="draft.label"
					:label="translate('zx_builder_field_label')"
					:placeholder="translate('zx_builder_field_label')"
					@update:modelValue="draft.label = $event"
				/>
			</div>
			<p v-if="error" class="rounded-xxs bg-utility-error/10 p-1 text-[10px] text-utility-error">{{ translate(error) }}</p>
			<BuilderButton size="xs" type="submit" tag="button" icon="add" :label="translate('zx_builder_repeater_create_field')" />
		</form>
		<p v-if="repeaterNode" class="text-[10px] leading-[1.5] text-zaux-dark-grey">{{ translate("zx_builder_repeater_drop_hint") }}</p>
	</fieldset>
</template>
<script>
	import { computed, defineComponent, ref } from "vue";
	import { useBuilder } from "../../../../composables/useBuilder.js";
	import { clone, dataFor, getValue } from "../../../../../domain/nodes.js";
	import { allowedEntries, isRepeaterNode, nodeRepeaters, REPEATER_KEY } from "../../../../../domain/repeater.js";

	// Repeater panel of the Properties tab: entries of every prop of the selected node bound to a
	// repeater field (a `component` field in list mode), edited where the value lives (template
	// data or field default, like the Data tab). An unbound Repeater offers to create the field.
	export default defineComponent({
		name: "BuilderRepeater",
		props: { node: { type: Object, required: true } },
		setup(props) {
			const builder = useBuilder();
			const draft = ref({ key: "items", label: "" });
			const error = ref("");
			const fields = computed(() => builder.activeDefinition.value?.fields ?? []);
			const repeaters = computed(() => nodeRepeaters(props.node, fields.value));
			const repeaterNode = computed(() => isRepeaterNode(props.node));
			// Free template blocks have no component contract: their Repeater keeps literal entries.
			const canCreate = computed(() => builder.mode.value === "library" || builder.activeInstance.value?.kind !== "free");
			const currentData = computed(() => builder.activeDefinition.value
				? dataFor(builder.activeDefinition.value, builder.mode.value === "template" ? builder.activeInstance.value?.data : {})
				: {});
			function valueOf(field) {
				const value = getValue(currentData.value, field.key);
				return Array.isArray(value) ? value : [];
			}
			function setValue(field, value) {
				if (builder.mode.value === "template") builder.updateData(field.key, value);
				else builder.updateDefinition((definition) => {
					definition.fields.find((item) => item.key === field.key).default = clone(value);
				});
			}
			function allowedOf(field) { return allowedEntries(field); }
			function create() {
				const key = draft.value.key.trim();
				if (!REPEATER_KEY.test(key) || fields.value.some((field) => field.key === key)) { error.value = "zx_builder_field_exists"; return; }
				error.value = "";
				builder.createSelectedRepeaterField({ key, label: draft.value.label.trim() });
			}
			return { ...builder, draft, error, repeaters, repeaterNode, canCreate, valueOf, setValue, allowedOf, create };
		},
	});
</script>
