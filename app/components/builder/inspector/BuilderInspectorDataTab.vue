<template>
	<template v-if="active && activeDefinition">
		<p
			class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
		>
			{{
				translate(
					mode === "library"
						? "zx_builder_library_notice"
						: "zx_builder_copy_notice",
				)
			}}
		</p>
		<p
			v-if="!activeDefinition.fields.length"
			class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
		>
			{{ translate("zx_builder_no_fields") }}
		</p>
		<fieldset :disabled="isSourceBase || (isSource && !hasSource)">
			<div
				v-for="field in visibleFields"
				:key="`${activeDefinition.id}-${field.key}`"
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label
					>{{ field.label }}<small>{{ field.key }}</small></label
				><BuilderValue
					:disabled="
						!canEditRemote || isSourceBase || (isSource && !hasSource)
					"
					:label="field.label"
					:type="fieldInputType(field)"
					:options="field.options"
					:modelValue="fieldValue(field)"
					@update:modelValue="setFieldValue(field, $event)"
				/><button
					v-if="
						mode === 'template' &&
						Object.hasOwn(activeInstance.data, field.key)
					"
					class="zb-text-link mt-1 !text-[10px] text-zaux-accent underline"
					@click="updateData(field.key, undefined)"
				>
					{{ translate("zx_builder_reset_value") }}
				</button>
			</div>
		</fieldset>
	</template>
</template>
<script>
import { defineComponent, computed } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { fieldInputType, isFieldVisible } from "../../../../domain/fields.js";
import { clone, dataFor, getValue } from "../../../../domain/nodes.js";
import BuilderValue from "../BuilderValue.vue";
export default defineComponent({
	components: { BuilderValue },
	props: { active: Boolean },
	setup() {
		const builder = useBuilder();
		const currentData = computed(() =>
			builder.activeDefinition.value
				? dataFor(
						builder.activeDefinition.value,
						builder.mode.value === "template"
							? builder.activeInstance.value?.data
							: {},
					)
				: {},
		);
		const visibleFields = computed(
			() =>
				builder.activeDefinition.value?.fields.filter((field) =>
					isFieldVisible(field, currentData.value),
				) ?? [],
		);
		function fieldValue(field) {
			return getValue(currentData.value, field.key);
		}
		function setFieldValue(field, value) {
			if (builder.mode.value === "template")
				builder.updateData(field.key, value);
			else
				builder.updateDefinition((def) => {
					def.fields.find((item) => item.key === field.key).default =
						clone(value);
				});
		}
		return { ...builder, visibleFields, fieldInputType, fieldValue, setFieldValue };
	},
});
</script>
