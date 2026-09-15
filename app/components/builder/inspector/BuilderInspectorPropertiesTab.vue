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
				<div class="zb-node-actions ml-auto flex [&>.zb-button]:!p-0.5 gap-1">
					<BuilderButton
						variant="light"
						icon="copy"
						iconOnly
						:label="translate('zx_builder_duplicate')"
						@click="duplicateNode"
					/><BuilderButton
						variant="light"
						icon="delete"
						iconOnly
						:label="translate('zx_builder_delete')"
						@click="deleteNode"
					/>
				</div>
			</div>
			<div class="zb-row mb-2 mt-1.5 flex gap-1 [&>*]:flex-1">
				<BuilderButton
					:extraProps="{
						customInnerClasses : 'justify-center flex w-full',
						customInnerWrapperClasses : 'items-center justify-center w-full'
					}"
					size="xs"
					icon="chevron-up"
					:label="translate('zx_builder_move_up')"
					@click="shiftNode(-1)"
				/><BuilderButton
					size="xs"
					:extraProps="{
						customInnerClasses : 'justify-center flex w-full',
						customInnerWrapperClasses : 'flex justify-center items-center w-full'
					}"
					icon="chevron-down"
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
      <p v-if="['OffCanvasTrigger', 'ZModalTrigger'].includes(selectedNode.name)" class="mb-2 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_overlay_trigger_hint') }}</p>
			<BuilderPartialFields v-if="selectedPartial" :key="selectedNode.id" :definition="selectedPartial" :reference="selectedNode" :bindings="activeDefinition.fields" :modelValue="selectedNode.props" @change="updateNode" />
			<BuilderSlider v-if="sliderConfig" :key="selectedNode.id + selectedNode.name" :node="selectedNode" />
			<BuilderProperty
				v-for="property in visibleProperties"
				:key="`${selectedNode.id}-${selectedNode.name}-${property}`"
				:property="property"
				:value="propertyValue(property)"
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
				/>
				<div class="flex flex-wrap gap-1 mt-1">
					<BuilderButton
						size="xs"
						:label="translate('zx_builder_apply')"
						@click="applyProps"
					/><BuilderButton
						icon="delete"
						iconOnly
						:label="translate('zx_builder_clear_json')"
						@click="clearProps"
					/>
				</div>
			</details>
		</template>
		<div
			v-else-if="!isSource"
			class="zb-inspector-empty px-1 py-4 text-center [&>span]:mb-2 [&>span]:block [&>span]:text-[34px] [&>span]:font-light [&>span]:text-zaux-light-grey [&>p]:mb-2 [&>p]:text-[12px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"
		>
			<span>↖</span>
			<p>{{ translate("zx_builder_select_hint") }}</p>
			<BuilderButton
				size="xs"
				class="mx-auto"
				:label="translate('zx_builder_elements')"
				@click="leftTab = 'elements'"
			/>
		</div>
		<div
			class="zb-context-card mt-3 rounded-xs bg-zaux-light/60 p-2 [&_p]:mb-1.5 [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-zaux-dark-grey"
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
				size="xs"
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
import { clone, isBinding } from "../../../../domain/nodes.js";
import BuilderPartialFields from "../fields/BuilderPartialFields.vue";
import BuilderSlider from "../fields/slides/BuilderSlider.vue";
import { sliderControls } from "../../../../integrations/zaux/slider-controls.js";
import { isPlainRecord } from "../../../../domain/slider.js";
import BuilderButton from "../BuilderButton.vue";
import BuilderInput from "../fields/BuilderInput.vue";
import BuilderProperty from "../fields/BuilderProperty.vue";
import BuilderCodeEditor from "../fields/BuilderCodeEditor.vue";
export default defineComponent({
	components: { BuilderPartialFields, BuilderSlider, BuilderButton, BuilderInput, BuilderProperty, BuilderCodeEditor },
	props: { active: Boolean },
	emits: ["error"],
	setup(_props, { emit }) {
		const builder = useBuilder();
		const propsDraft = ref("");
    const sliderConfig = computed(() => sliderControls[builder.selectedNode.value?.name]);
    function specializedProperty(key) {
      if (builder.selectedPartial.value?.fields.some(field => field.key === key)) return true;
      if (!sliderConfig.value) return false;
      const props = builder.selectedNode.value.props;
      const contentPath = sliderConfig.value.contentPath;
      if (contentPath) {
        if (key === contentPath) return isPlainRecord(props[key]);
      } else {
        if (key === 'slides') return Array.isArray(props.slides);
        if (key === 'customSliderParams') return isPlainRecord(props.customSliderParams);
      }
      return sliderConfig.value.fields.some(field => field.path === key) && !isBinding(props[key]);
    }
    const descriptors = computed(() => {
      const node = builder.selectedNode.value;
      const trees = builder.mode.value === 'library'
        ? [builder.activeDefinition.value?.tree ?? []]
        : (builder.activeTemplate.value?.instances ?? []).map(instance => instance.definition.tree);
      return propertyInfo(node?.name, { props: node?.props ?? {}, trees });
    });
		const visibleProperties = computed(() =>
			Object.keys(builder.selectedNode.value?.props ?? {}).filter(
				(key) => !["class", "style"].includes(key) && !specializedProperty(key),
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
    function propertyValue(key) {
      const node = builder.selectedNode.value;
      return node.name === 'ButtonBlock' && key === 'size' && isPlainRecord(node.props.content) && !isBinding(node.props.content)
        ? node.props.content.size ?? node.props.size : node.props[key];
    }
    function setProperty(key, value) {
      const node = builder.selectedNode.value;
      const props = { ...node.props, [key]: value };
      if (node.name === 'ButtonBlock' && key === 'size' && isPlainRecord(props.content) && !isBinding(props.content)) props.content = { ...props.content, size: value };
      builder.updateNode(props);
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
		return { ...builder, sliderConfig, catalog, descriptors, visibleProperties, extraProperties, propsDraft, propertyValue, setProperty, addProperty, changeType, clearProps, applyProps };
	},
});
</script>
