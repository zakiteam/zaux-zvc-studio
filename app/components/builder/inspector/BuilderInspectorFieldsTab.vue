<template>
	<p
		v-if="isSource"
		class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
	>
		{{ translate("zx_builder_source_fields") }}
	</p>
	<div v-else>
		<p
			class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
		>
			{{ translate("zx_builder_fields_hint") }}
		</p>
		<details
			v-for="field in activeDefinition.fields"
			:key="field.key"
			class="zb-field-card"
		>
			<summary>
				{{ field.label }} <code>{{ field.key }}</code>
			</summary>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_field_label") }}</label
				><input
					class="px-2 py-1"
					:value="field.label"
					@change="updateField(field.key, 'label', $event.target.value)"
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_field_type") }}</label
				><select
					class="px-2 py-1"
					:value="field.type"
					@change="changeType(field.key, $event.target.value)"
				>
					<option v-for="type in types" :key="type" :value="type">
						{{ translate(`zx_builder_${type}`) }}
					</option>
				</select>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_default") }}</label
				><BuilderValue
					:modelValue="field.default"
					:label="`${field.key} default`"
					:type="field.type"
					:options="field.options"
					@update:modelValue="updateField(field.key, 'default', $event)"
				/>
			</div>
			<div
				v-if="field.type === 'select'"
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_options") }}</label
				><textarea
					class="px-2 py-1"
					:value="
						field.options.map((option) => option.value ?? option).join('\n')
					"
					@change="
						updateField(
							field.key,
							'options',
							$event.target.value
								.split('\n')
								.filter(Boolean)
								.map((value) => ({ label: value, value })),
						)
					"
				/>
			</div>
			<BuilderButton
				:label="translate('zx_builder_delete')"
				@click="deleteField(field.key)"
			/>
		</details>
		<form
			class="zb-new-field border-t-slim border-zaux-light-grey py-2.5 [&>h3]:mb-2.5 [&>h3]:text-[14px]"
			@submit.prevent="addField"
		>
			<h3>{{ translate("zx_builder_new_field") }}</h3>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label for="field-key">{{ translate("zx_builder_field_key") }}</label
				><input
					class="px-2 py-1 border-none bg-zaux-light"
					id="field-key"
					v-model="newKey"
					pattern="[A-Za-z_][A-Za-z0-9_.]*"
					required
					placeholder="section.title"
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label for="field-label">{{
					translate("zx_builder_field_label")
				}}</label
				><input
					class="px-2 py-1 border-none bg-zaux-light"
					id="field-label"
					v-model="newLabel"
					required
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_field_type") }}</label
				><select class="px-2 py-1 border-none bg-zaux-light" v-model="newType">
					<option v-for="type in types" :key="type" :value="type">
						{{ translate(`zx_builder_${type}`) }}
					</option>
				</select>
			</div>
			<button
				type="submit"
				class="zb-submit inline-flex min-h-[36px] items-center justify-center rounded-xxs bg-zaux-accent px-2.5 py-1.5 !text-[12px] text-zaux-white hover:bg-zaux-dark-accent"
			>
				+ {{ translate("zx_builder_add") }}
			</button>
		</form>
		<p
			v-if="fieldError"
			class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
		>
			{{ translate(fieldError) }}
		</p>
	</div>
</template>
<script>
import { defineComponent, ref } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import BuilderButton from "../BuilderButton.vue";
import BuilderValue from "../fields/BuilderValue.vue";
export default defineComponent({
	components: { BuilderButton, BuilderValue },
	setup() {
		const builder = useBuilder();
		const newKey = ref("");
		const newLabel = ref("");
		const newType = ref("text");
		const fieldError = ref("");
		const types = ["text", "textarea", "number", "switch", "select", "json"];
		const defaultFor = (type) =>
			type === "switch"
				? false
				: type === "number"
					? 0
					: type === "json"
						? {}
						: "";
		function updateField(key, property, value) {
			builder.updateDefinition((def) => {
				def.fields.find((field) => field.key === key)[property] = value;
			});
		}
		function changeType(key, type) {
			builder.updateDefinition((def) => {
				const field = def.fields.find((field) => field.key === key);
				field.type = type;
				field.default = defaultFor(type);
				if (type === "select") field.options = [];
			});
		}
		function addField() {
			const key = newKey.value.trim();
			if (
				!/^[A-Za-z_][\w.]*$/.test(key) ||
				builder.activeDefinition.value.fields.some((field) => field.key === key)
			) {
				fieldError.value = "zx_builder_field_exists";
				return;
			}
			builder.updateDefinition((def) =>
				def.fields.push({
					key,
					label: newLabel.value.trim(),
					type: newType.value,
					default: defaultFor(newType.value),
					...(newType.value === "select" ? { options: [] } : {}),
				}),
			);
			newKey.value = "";
			newLabel.value = "";
			fieldError.value = "";
		}
		function deleteField(key) {
			if (
				JSON.stringify(builder.activeDefinition.value.tree).includes(
					`"$bind":${JSON.stringify(key)}`,
				)
			) {
				fieldError.value = "zx_builder_field_used";
				return;
			}
			builder.updateDefinition((def) => {
				def.fields = def.fields.filter((field) => field.key !== key);
			});
			fieldError.value = "";
		}
		return {
			...builder,
			types,
			newKey,
			newLabel,
			newType,
			fieldError,
			updateField,
			changeType,
			addField,
			deleteField,
		};
	},
});
</script>
