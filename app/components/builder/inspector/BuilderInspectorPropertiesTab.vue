<template>
	<template v-if="active && activeDefinition">
		<template v-if="selectedNode && !isSource">
			<div
				class="zb-node-heading mb-1.5 flex items-center gap-1 [&_strong]:text-[12px] [&_strong]:font-semibold [&_small]:mt-0.5 [&_small]:block [&_small]:text-[10px] [&_small]:text-zaux-dark-grey"
			>
				<span
					class="zb-node-icon grid h-[32px] w-[32px] place-items-center rounded-xxs bg-zaux-accent/10 text-[21px] text-zaux-accent"
					>◇</span
				>
				<div>
					<strong>{{ selectedNode.name }}</strong
					><small>{{ translate("zx_builder_properties") }}</small>
				</div>
				<div class="zb-node-actions ml-auto flex [&>.zb-button]:!p-0.5">
					<BuilderButton
						icon="copy"
						iconOnly
						:label="translate('zx_builder_duplicate')"
						@click="duplicateNode"
					/><BuilderButton
						icon="delete"
						iconOnly
						:label="translate('zx_builder_delete')"
						@click="deleteNode"
					/>
				</div>
			</div>
			<div class="zb-row mb-2 mt-1.5 flex gap-1 [&>*]:flex-1">
				<BuilderButton
					:label="translate('zx_builder_move_up')"
					@click="shiftNode(-1)"
				/><BuilderButton
					:label="translate('zx_builder_move_down')"
					@click="shiftNode(1)"
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_node_name") }}</label
				><BuilderInput
					type="select"
					:modelValue="selectedNode.name"
					:options="[
						...(catalog.some(
							(entry) => entry.name === selectedNode.name,
						)
							? []
							: [
									{
										value: selectedNode.name,
										label: selectedNode.name,
									},
								]),
						...catalog.map((entry) => ({
							value: entry.name,
							label: entry.name,
						})),
					]"
					@change="changeType"
				/>
			</div>
			<BuilderProperty
				v-for="property in visibleProperties"
				:key="`${selectedNode.id}-${selectedNode.name}-${property}`"
				:property="property"
				:value="selectedNode.props[property]"
				:fields="activeDefinition.fields"
				:descriptor="descriptors[property]"
				@change="setProperty(property, $event)"
			/>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label
					>{{ translate("zx_builder_add") }} ·
					{{ translate("zx_builder_properties") }}</label
				><BuilderInput
					type="select"
					modelValue=""
					:options="[
						{ value: '', label: '+' },
						...extraProperties.map((property) => ({
							value: property,
							label: property,
						})),
					]"
					@change="addProperty"
				/>
			</div>
			<details>
				<summary>{{ translate("zx_builder_advanced") }}</summary>
				<BuilderCodeEditor
					v-model="propsDraft"
					rows="14"
					:label="translate('zx_builder_advanced')"
				/><BuilderButton
					:label="translate('zx_builder_apply')"
					@click="applyProps"
				/><BuilderButton
					icon="delete"
					iconOnly
					:label="translate('zx_builder_clear_json')"
					@click="clearProps"
				/>
			</details>
		</template>
		<div
			v-else-if="!isSource"
			class="zb-inspector-empty px-1 py-4 text-center [&>span]:mb-2 [&>span]:block [&>span]:text-[34px] [&>span]:font-light [&>span]:text-zaux-light-grey [&>p]:mb-2 [&>p]:text-[12px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"
		>
			<span>↖</span>
			<p>{{ translate("zx_builder_select_hint") }}</p>
			<BuilderButton
				class="mx-auto"
				:label="translate('zx_builder_elements')"
				@click="leftTab = 'elements'"
			/>
		</div>
		<div
			class="zb-context-card mt-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2 [&_p]:mb-1.5 [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-zaux-dark-grey"
		>
			<span
				class="zb-badge inline-block rounded-xxs bg-zaux-light px-0.75 py-0.25 font-mono text-[10px] tracking-[0.8px] text-zaux-dark-grey"
				>{{ mode === "library" ? "ZVC" : "COPY" }}</span
			>
			<p>
				{{
					translate(
						mode === "library"
							? "zx_builder_library_notice"
							: "zx_builder_copy_notice",
					)
				}}
			</p>
			<BuilderButton
				v-if="mode === 'template'"
				:label="translate('zx_builder_save_library')"
				@click="
					modal = { type: 'save-library', name: activeInstance.name }
				"
			/>
		</div>
	</template>
</template>
<script>
import { defineComponent, computed, ref, watch } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { catalog, propertyInfo } from "../../../services/catalog.js";
import { parseJson } from "../../../../domain/validation.js";
import { clone } from "../../../../domain/nodes.js";
import BuilderButton from "../BuilderButton.vue";
import BuilderInput from "../BuilderInput.vue";
import BuilderProperty from "../BuilderProperty.vue";
import BuilderCodeEditor from "../BuilderCodeEditor.vue";
export default defineComponent({
	components: { BuilderButton, BuilderInput, BuilderProperty, BuilderCodeEditor },
	props: { active: Boolean },
	emits: ["error"],
	setup(_props, { emit }) {
		const builder = useBuilder();
		const propsDraft = ref("");
		const descriptors = computed(() =>
			propertyInfo(builder.selectedNode.value?.name),
		);
		const visibleProperties = computed(() =>
			Object.keys(builder.selectedNode.value?.props ?? {}).filter(
				(key) => !["class", "style"].includes(key),
			),
		);
		const extraProperties = computed(() =>
			Object.keys(descriptors.value)
				.filter(
					(key) =>
						!Object.hasOwn(builder.selectedNode.value?.props ?? {}, key) &&
						!["class", "style"].includes(key),
				)
				.sort(),
		);
		watch(
			builder.selectedNode,
			(value) => {
				propsDraft.value = JSON.stringify(value?.props ?? {}, null, 2);
			},
			{ deep: true, immediate: true },
		);
		function setProperty(key, value) {
			builder.updateNode({ ...builder.selectedNode.value.props, [key]: value });
		}
		function addProperty(event) {
			const key = event.target.value;
			if (!key) return;
			const descriptor = descriptors.value[key];
			const value = descriptor?.default;
			setProperty(
				key,
				typeof value === "function"
					? descriptor.type === Array
						? []
						: descriptor.type === Object
							? {}
							: null
					: (value === undefined ? "" : clone(value)),
			);
			event.target.value = "";
		}
		function changeType(event) {
			builder.changeNodeType(event.target.value);
		}
		function clearProps() {
			propsDraft.value = "{}";
			applyProps();
		}
		function applyProps() {
			try {
				const props = parseJson(propsDraft.value);
				if (!props || typeof props !== "object" || Array.isArray(props))
					throw new Error();
				builder.updateNode(props);
				emit("error", "");
			} catch {
				emit("error", "zx_builder_invalid_json");
			}
		}
		return { ...builder, catalog, descriptors, visibleProperties, extraProperties, propsDraft, setProperty, addProperty, changeType, clearProps, applyProps };
	},
});
</script>
