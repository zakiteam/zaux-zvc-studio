<template>
	<fieldset
		:disabled="!canEditRemote || remoteProjectBusy"
		class="zb-props-binding mb-2.5 grid min-w-0 gap-1 rounded-xxs border-slim p-1.5"
		:class="bound ? 'border-zaux-accent/20 bg-zaux-accent/5' : 'border-dashed border-zaux-light-grey'"
	>
		<div class="flex min-w-0 items-center gap-1">
			<label
				:for="`props-binding-${node.id}`"
				class="min-w-0 flex-1 truncate text-[11px] font-medium"
				:title="translate('zx_builder_props_binding_hint')"
			>{{ translate("zx_builder_props_binding") }}</label>
			<select
				:id="`props-binding-${node.id}`"
				class="min-w-0 max-w-[60%] border-none bg-transparent p-0.5 text-[10px] text-zaux-dark-grey"
				:value="creating ? NEW : (bound ?? '')"
				@change="choose($event.target.value)"
			>
				<option value="">{{ translate("zx_builder_props_binding_none") }}</option>
				<option v-for="field in options" :key="field.key" :value="field.key">
					↗ {{ field.label || field.key }} · {{ field.key }}
				</option>
				<option :value="NEW">＋ {{ translate("zx_builder_props_binding_new") }}</option>
			</select>
		</div>

		<form v-if="creating" class="grid gap-1" @submit.prevent="create">
			<div class="grid grid-cols-2 gap-1 [&>*]:min-w-0">
				<BuilderInput
					:id="`props-binding-${node.id}-key`"
					:modelValue="draft.key"
					:label="translate('zx_builder_field_key')"
					:placeholder="translate('zx_builder_field_key')"
					required
					@update:modelValue="draft.key = $event"
				/>
				<BuilderInput
					:id="`props-binding-${node.id}-label`"
					:modelValue="draft.label"
					:label="translate('zx_builder_field_label')"
					:placeholder="translate('zx_builder_field_label')"
					@update:modelValue="draft.label = $event"
				/>
			</div>
			<BuilderInput
				type="select"
				:modelValue="draft.type"
				:label="translate('zx_builder_field_type')"
				:options="types"
				@update:modelValue="draft.type = $event"
			/>
			<p class="text-[10px] leading-[1.5] text-zaux-dark-grey">
				{{ translate("zx_builder_props_binding_new_hint", { keys: movableKeys.join(", ") || "—" }) }}
			</p>
			<p v-if="error" class="rounded-xxs bg-utility-error/10 p-1 text-[10px] text-utility-error">{{ translate(error) }}</p>
			<div class="flex gap-1">
				<BuilderButton size="xs" type="submit" tag="button" icon="add" :label="translate('zx_builder_create')" />
				<BuilderButton size="xs" variant="light" :label="translate('zx_builder_cancel')" @click="cancel" />
			</div>
		</form>

		<template v-else-if="bound">
			<p v-if="!boundField" class="rounded-xxs bg-utility-error/10 p-1 text-[10px] text-utility-error">
				{{ translate("zx_builder_props_binding_missing", { key: bound }) }}
			</p>
			<p v-else class="text-[10px] leading-[1.5] text-zaux-dark-grey">
				{{ translate("zx_builder_props_binding_active", { field: boundField.label || boundField.key }) }}
			</p>
			<BuilderButton
				v-if="boundField && movableKeys.length"
				size="xs"
				variant="light"
				icon="enter"
				:label="translate('zx_builder_props_binding_move', { count: movableKeys.length })"
				:title="movableKeys.join(', ')"
				@click="bindSelectedProps(bound, { move: true })"
			/>
		</template>
	</fieldset>
</template>
<script>
import { defineComponent, computed, reactive, ref, watch } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { spreadKey } from "../../../../domain/nodes.js";
import { PROPS_FIELD_TYPES, fieldDefault } from "../../../../domain/fields.js";
import { movableProps, propsFieldSuggestion } from "../../../../domain/props-binding.js";

const NEW = "__new";

// Binds the whole props object of a node to an object field (`$spread`), or creates
// that field from the node's current content props.
export default defineComponent({
	name: "BuilderPropsBinding",
	props: { node: Object },
	setup(props) {
		const builder = useBuilder();
		const creating = ref(false);
		const error = ref("");
		const draft = reactive({ key: "", label: "", type: "json" });
		const fields = computed(() => builder.activeDefinition.value?.fields ?? []);
		const bound = computed(() => spreadKey(props.node.props));
		const boundField = computed(() => fields.value.find((field) => field.key === bound.value) ?? null);
		// Object fields, plus the current one even when its type no longer fits.
		const options = computed(() =>
			fields.value.filter((field) => PROPS_FIELD_TYPES.includes(field.type) || field.key === bound.value),
		);
		const movableKeys = computed(() => Object.keys(movableProps(props.node.props)));
		const types = computed(() =>
			PROPS_FIELD_TYPES.map((type) => ({ value: type, label: `${builder.translate(`zx_builder_${type}`)} · ${type}` })),
		);
		watch(() => props.node.id, () => { creating.value = false; error.value = ""; });
		function choose(value) {
			error.value = "";
			if (value === NEW) {
				Object.assign(draft, propsFieldSuggestion(props.node.name, fields.value));
				creating.value = true;
				return;
			}
			creating.value = false;
			if (value !== (bound.value ?? "")) builder.bindSelectedProps(value || null);
		}
		function create() {
			const key = draft.key.trim();
			if (!/^[A-Za-z_][\w.]*$/.test(key) || fields.value.some((field) => field.key === key)) {
				error.value = "zx_builder_field_exists";
				return;
			}
			const field = { key, label: draft.label.trim(), type: draft.type, default: fieldDefault(draft.type) };
			builder.bindSelectedProps(key, { move: true, field });
			creating.value = false;
			error.value = "";
		}
		function cancel() {
			creating.value = false;
			error.value = "";
		}
		return {
			...builder,
			NEW,
			creating,
			error,
			draft,
			bound,
			boundField,
			options,
			movableKeys,
			types,
			choose,
			create,
			cancel,
		};
	},
});
</script>
