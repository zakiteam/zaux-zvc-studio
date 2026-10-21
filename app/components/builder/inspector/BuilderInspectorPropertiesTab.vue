<template>
	<template v-if="active && activeDefinition">
		<template v-if="selectedNode && !isSource">
			<div
				class="zb-node-heading mb-1.5 flex flex-wrap items-center gap-1 [&_strong]:text-[12px] [&_strong]:font-semibold [&_small]:mt-0.5 [&_small]:block [&_small]:text-[10px] [&_small]:text-zaux-dark-grey"
			>
				<span
					class="zb-node-icon grid h-[32px] w-[32px] shrink-0 place-items-center rounded-xxs bg-zaux-accent/10 text-[21px] text-zaux-accent"
					>◇</span
				>
				<div class="min-w-0 flex-1">
					<strong>{{ selectedNode.name }}</strong
					><small>{{ outlineBulk ? translate("zx_builder_selection_count", { count: outlineSelection.length }) : translate("zx_builder_properties") }}</small>
				</div>
				<div class="zb-node-actions ml-auto flex [&>.zb-button]:!p-0.5 gap-1">
					<BuilderButton
						variant="light"
						icon="chevron-up"
						iconOnly
						:label="translate('zx_builder_parent')"
						@click="selectParent"
					/><BuilderButton
						variant="light"
						icon="copy"
						iconOnly
						:label="translate('zx_builder_duplicate')"
						@click="outlineBulk ? duplicateOutlineSelection() : duplicateNode()"
					/><BuilderButton
						variant="light"
						icon="delete"
						iconOnly
						:label="translate('zx_builder_delete')"
						@click="outlineBulk ? deleteOutlineSelection() : deleteNode()"
					/>
				</div>
			</div>
			<div class="zb-row mb-2 mt-1.5 flex flex-wrap gap-1 [&>*]:flex-1">
				<BuilderButton
					:extraProps="{
						customInnerClasses: 'justify-center flex w-full',
						customInnerWrapperClasses: 'items-center justify-center w-full',
					}"
					size="xs"
					icon="chevron-up"
					:label="translate('zx_builder_move_up')"
					@click="shiftNode(-1)"
				/><BuilderButton
					size="xs"
					:extraProps="{
						customInnerClasses: 'justify-center flex w-full',
						customInnerWrapperClasses:
							'flex justify-center items-center w-full',
					}"
					icon="chevron-down"
					:label="translate('zx_builder_move_down')"
					@click="shiftNode(1)"
				/>
			</div>
			<div
				class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_node_name") }}</label
				><BuilderDropdown
					class="w-full min-w-0"
					:label="translate('zx_builder_node_name')"
					:items="typeItems"
					filterItems
					@select="changeType"
				>
					<template #trigger="{ open, menuId }">
						<button
							type="button"
							class="flex w-full min-w-0 items-center gap-1 rounded-xxs bg-zaux-light px-1.5 py-1 text-left text-cta-s focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
							:title="selectedNode.name"
							:aria-label="`${translate('zx_builder_node_name')}: ${selectedNode.name}`"
							:aria-expanded="open"
							aria-haspopup="menu"
							:aria-controls="menuId"
						>
							<span class="min-w-0 flex-1 truncate text-body-s">{{ selectedNode.name }}</span>
							<small v-if="selectedTypeGroup" class="shrink-0 text-[9px] uppercase tracking-wider text-zaux-dark-grey">{{ selectedTypeGroup }}</small>
							<svg class="h-[12px] w-[12px] shrink-0 transition-transform" :class="{ 'rotate-180': open }" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'dropdown-bottom')" /></svg>
						</button>
					</template>
				</BuilderDropdown>
			</div>
			<p
				v-if="['OffCanvasTrigger', 'ZModalTrigger'].includes(selectedNode.name)"
				class="mb-2 text-[11px] text-zaux-dark-grey"
			>
				{{ translate("zx_builder_overlay_trigger_hint") }}
			</p>

			<BuilderPropsBinding
				v-if="!selectedPartial"
				:key="'props-binding-' + selectedNode.id"
				:node="selectedNode"
			/>

			<BuilderRepeater
				v-if="repeaterPanel"
				:key="'repeater-' + selectedNode.id"
				:node="selectedNode"
			/>

			<BuilderPartialFields
				v-if="selectedPartial"
				:key="selectedNode.id"
				:definition="selectedPartial"
				:reference="selectedNode"
				:bindings="activeDefinition.fields"
				:modelValue="selectedNode.props"
				@change="updateNode"
			/>

			<BuilderSlider
				v-if="sliderConfig"
				:key="selectedNode.id + selectedNode.name"
				:node="selectedNode"
			/>

			<BuilderLightbox
				v-if="lightboxConfig"
				:key="selectedNode.id + selectedNode.name"
				:node="selectedNode"
			/>

			<BuilderLightboxTrigger
				v-else-if="lightboxTrigger"
				:key="selectedNode.id + selectedNode.name"
				:node="selectedNode"
			/>

			<BuilderOverlayContent
				v-if="overlayContent"
				:key="selectedNode.id + selectedNode.name"
				:node="selectedNode"
			/>

			<BuilderMedia
				v-if="mediaConfig"
				:key="selectedNode.id + selectedNode.name"
				:node="selectedNode"
			/>

			<div
				v-if="visibleProperties.length || extraProperties.length"
				ref="propertyToolbar"
				class="mb-1 mt-1 flex items-center gap-1"
			>
				<input
					v-if="visibleProperties.length >= 6"
					v-model="propertyFilter"
					type="search"
					class="min-w-0 flex-1 border-none bg-zaux-light px-1.5 py-0.75 text-[11px]"
					:placeholder="translate('zx_builder_prop_filter')"
					:aria-label="translate('zx_builder_prop_filter')"
					autocomplete="off"
					@keydown.esc="propertyFilter = ''"
				/>
				<p v-else class="min-w-0 flex-1 truncate text-[11px] font-medium">{{ translate("zx_builder_properties") }}</p>
				<BuilderDropdown
					v-if="extraProperties.length"
					:label="translate('zx_builder_prop_add')"
					:items="addItems"
					filterItems
					align="end"
					@select="addProperty($event.id)"
				>
					<template #trigger="{ open, menuId }">
						<button
							type="button"
							class="flex shrink-0 items-center gap-0.5 rounded-xxs bg-zaux-accent/10 px-1 py-0.75 text-[11px] font-medium text-zaux-accent hover:bg-zaux-accent/20"
							:title="translate('zx_builder_prop_add')"
							:aria-expanded="open"
							aria-haspopup="menu"
							:aria-controls="menuId"
						>
							<svg class="h-[11px] w-[11px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'plus')" /></svg>
							{{ translate("zx_builder_prop_add_short") }}
						</button>
					</template>
				</BuilderDropdown>
			</div>
			<p v-if="propertyFilter && !groupedProperties.length" class="mb-2 text-[11px] text-zaux-dark-grey">
				{{ translate("zx_builder_dropdown_no_results") }}
			</p>

			<BuilderInspectorSection
				v-for="group in groupedProperties"
				:id="`props-${group.id}`"
				:key="group.id"
				:title="translate(`zx_builder_prop_group_${group.id}`)"
				:count="group.keys.length"
				:defaultOpen="group.id !== 'advanced' || groupedProperties.length === 1"
				:forceOpen="!!propertyFilter"
			>
				<BuilderProperty
					v-for="property in group.keys"
					:key="`${selectedNode.id}-${selectedNode.name}-${property}`"
					:property="property"
					:value="propertyValue(property)"
					:fields="activeDefinition.fields"
					:descriptor="descriptors[property]"
					:overriddenBy="spreadOverrides.has(property) ? spreadField : ''"
					removable
					@change="setProperty(property, $event)"
					@remove="removeProperty(property)"
				/>
			</BuilderInspectorSection>

			<BuilderInspectorSection
				v-if="contentSlotsEditor"
				id="content-slots"
				:title="translate('zx_builder_content_slots')"
				:count="filledSlots"
				accent
			>
				<BuilderContentSlots
					:key="selectedNode.id + selectedNode.name"
					:node="selectedNode"
				/>
			</BuilderInspectorSection>

			<BuilderInspectorSection
				v-if="attributesEditor"
				id="attributes"
				:title="translate('zx_builder_attributes')"
				:count="attributeTotal"
				accent
				:defaultOpen="false"
			>
				<BuilderAttributes
					:key="selectedNode.id + selectedNode.name"
					:node="selectedNode"
					:config="attributesEditor"
				/>
			</BuilderInspectorSection>

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
				>{{ mode === "template" && activeInstance?.kind === "free" ? translate("zx_builder_free_element") : mode === "library" ? "ZVC" : "COPY" }}</span
			>
			<p>
				{{
					translate(
						mode === "library"
							? "zx_builder_library_notice"
							: activeInstance?.kind === "free" ? "zx_builder_group_zvc_hint" : "zx_builder_copy_notice",
					)
				}}
			</p>
			<BuilderButton
				size="xs"
				v-if="mode === 'template'"
				:label="translate(activeInstance.kind === 'free' ? 'zx_builder_group_zvc' : 'zx_builder_save_library')"
				@click="modal = activeInstance.kind === 'free' ? { type: 'group-zvc', instanceId: activeInstance.id } : { type: 'save-library', name: activeInstance.name }"
			/>
		</div>
	</template>
</template>
<script>
import { defineComponent, computed, nextTick, ref, watch } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { useInspectorSections } from "../../../composables/useInspectorSections.js";
import { catalog, propertyInfo, componentMenuItems } from "../../../services/catalog.js";
import { iconHref } from "@integration/options/icon-options.js";
import { parseJson } from "../../../../domain/validation.js";
import { SPREAD, dataFor, getValue, isBinding, spreadKey } from "../../../../domain/nodes.js";
import { propertyAddedValue } from "../../../../domain/properties.js";
import { attributesEditable, attributeCount } from "../../../../domain/attributes.js";
import { sliderControls } from "../../../../integrations/zaux/controls/slider-controls.js";
import { lightboxControls, isLightboxTrigger } from "../../../../integrations/zaux/controls/lightbox-controls.js";
import { contentSlotConfig } from "../../../../integrations/zaux/controls/content-slot-controls.js";
import { attributeConfig } from "../../../../integrations/zaux/controls/attribute-controls.js";
import { propertyGroups, propertyGroup, isInternalProperty, featuredProperties } from "../../../../integrations/zaux/descriptors/property-groups.js";
import { isPlainRecord } from "../../../../domain/slider.js";
import { isRepeaterNode, nodeRepeaters } from "../../../../domain/repeater.js";
export default defineComponent({
	props: { active: Boolean },
	emits: ["error"],
	setup(_props, { emit }) {
		const builder = useBuilder();
		const { setSectionOpen } = useInspectorSections();
		const propsDraft = ref("");
		const propertyFilter = ref("");
		const propertyToolbar = ref(null);
		const sliderConfig = computed(
			() => sliderControls[builder.selectedNode.value?.name],
		);
		const lightboxConfig = computed(
			() => lightboxControls[builder.selectedNode.value?.name],
		);
		const lightboxTrigger = computed(() =>
			isLightboxTrigger(builder.selectedNode.value),
		);
		// Repeater element, or any node with a prop bound to a repeater field (e.g. slider slides).
		const repeaterPanel = computed(() => !builder.selectedPartial.value && (isRepeaterNode(builder.selectedNode.value)
			|| nodeRepeaters(builder.selectedNode.value, builder.activeDefinition.value?.fields ?? []).length > 0));
		const overlayContent = computed(() =>
			["ZModal", "OffCanvas"].includes(builder.selectedNode.value?.name),
		);
		const mediaConfig = computed(
			() => builder.selectedNode.value?.name === "Media",
		);
		const descriptors = computed(() => {
			const node = builder.selectedNode.value;
			const trees =
				builder.mode.value === "library"
					? [builder.activeDefinition.value?.tree ?? []]
					: (builder.activeTemplate.value?.instances ?? []).map(
							(instance) => instance.definition.tree,
						);
			return propertyInfo(node?.name, { props: node?.props ?? {}, trees });
		});
		// The component declares (or the node already carries) the prop.
		function supports(key) {
			return Object.hasOwn(descriptors.value, key) || Object.hasOwn(builder.selectedNode.value?.props ?? {}, key);
		}
		// Dedicated editors driven by the generated Zaux hook registries. A bound or
		// non-object value keeps the generic property editor.
		const contentSlotsEditor = computed(() => {
			const node = builder.selectedNode.value;
			if (!node || !supports("contentSlots")) return false;
			const value = node.props?.contentSlots;
			return !!contentSlotConfig(node.name, node.props ?? {}) && (value == null || isPlainRecord(value));
		});
		const attributesEditor = computed(() => {
			const node = builder.selectedNode.value;
			if (!node || !supports("attributes") || !attributesEditable(node.props?.attributes)) return null;
			return attributeConfig(node.name);
		});
		const filledSlots = computed(() => {
			const value = builder.selectedNode.value?.props?.contentSlots;
			return isPlainRecord(value) ? Object.keys(value).length : 0;
		});
		const attributeTotal = computed(() =>
			attributeCount(builder.selectedNode.value?.props?.attributes, attributesEditor.value?.mode),
		);
		function specializedProperty(key) {
			if (
				mediaConfig.value &&
				["type", "props", "fillSpace", "containerClasses", "elementClasses"].includes(key)
			)
				return true;
			if (
				builder.selectedPartial.value?.fields.some((field) => field.key === key)
			)
				return true;
			if (key === "contentSlots" && contentSlotsEditor.value) return true;
			if (key === "attributes" && attributesEditor.value) return true;
			const node = builder.selectedNode.value;
			if (lightboxConfig.value) {
				return ["id", "items", "options"].includes(key);
			}
			if (lightboxTrigger.value) {
				return [
					"data-zlightbox-trigger",
					"data-zlightbox-id",
					"data-index",
				].includes(key);
			}
			if (!sliderConfig.value) return false;
			const props = node.props;
			const contentPath = sliderConfig.value.contentPath;
			if (contentPath) {
				if (key === contentPath) return isPlainRecord(props[key]);
			} else {
				if (key === "slides") return Array.isArray(props.slides);
				if (key === "customSliderParams")
					return isPlainRecord(props.customSliderParams);
			}
			return (
				sliderConfig.value.fields.some((field) => field.path === key) &&
				!isBinding(props[key])
			);
		}
		const visibleProperties = computed(() =>
			Object.keys(builder.selectedNode.value?.props ?? {}).filter(
				(key) => !["class", "style", SPREAD].includes(key) && !specializedProperty(key),
			),
		);
		// Props whose value currently comes from the field bound to the whole component.
		const spreadField = computed(() => {
			const key = spreadKey(builder.selectedNode.value?.props);
			const field = builder.activeDefinition.value?.fields.find((item) => item.key === key);
			return key === null ? "" : field?.label || key;
		});
		const spreadOverrides = computed(() => {
			const key = spreadKey(builder.selectedNode.value?.props);
			if (key === null) return new Set();
			const data = dataFor(builder.activeDefinition.value, builder.mode.value === "template" ? builder.activeInstance.value?.data ?? {} : {});
			const value = getValue(data, key);
			return new Set(value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : []);
		});
		function groupOf(key) {
			return propertyGroup(builder.selectedNode.value?.name, key, descriptors.value[key] ?? {});
		}
		function propertyLabel(key) {
			const labelKey = descriptors.value[key]?.labelKey;
			return labelKey ? builder.translate(labelKey) : key;
		}
		// Authored props by section, in authored order; the filter matches name and label.
		const groupedProperties = computed(() => {
			const query = propertyFilter.value.trim().toLowerCase();
			const keys = visibleProperties.value.filter((key) =>
				!query || key.toLowerCase().includes(query) || propertyLabel(key).toLowerCase().includes(query),
			);
			return propertyGroups
				.map((id) => ({ id, keys: keys.filter((key) => groupOf(key) === id) }))
				.filter((group) => group.keys.length);
		});
		const extraProperties = computed(() =>
			Object.keys(descriptors.value)
				.filter(
					(key) =>
						!Object.hasOwn(builder.selectedNode.value?.props ?? {}, key) &&
						!["class", "style"].includes(key) &&
						!isInternalProperty(key) &&
						!(key === "contentSlots" && contentSlotsEditor.value) &&
						!(key === "attributes" && attributesEditor.value),
				)
				.sort(),
		);
		// Add menu: the component's suggested props first, then every section.
		const addItems = computed(() => {
			const featured = featuredProperties(builder.selectedNode.value?.name).filter((key) => extraProperties.value.includes(key));
			const item = (key) => ({ id: key, label: propertyLabel(key) === key ? key : `${propertyLabel(key)} · ${key}` });
			return [
				...(featured.length ? [{ id: "heading-featured", heading: builder.translate("zx_builder_prop_suggested") }, ...featured.map(item)] : []),
				...propertyGroups.flatMap((group) => {
					const keys = extraProperties.value.filter((key) => !featured.includes(key) && groupOf(key) === group);
					return keys.length ? [{ id: "heading-" + group, heading: builder.translate(`zx_builder_prop_group_${group}`) }, ...keys.map(item)] : [];
				}),
			];
		});
		watch(
			builder.selectedNode,
			(value) => {
				propsDraft.value = JSON.stringify(value?.props ?? {}, null, 2);
			},
			{ deep: true, immediate: true },
		);
		watch(() => builder.selectedNode.value?.id, () => { propertyFilter.value = ""; });
		function propertyValue(key) {
			const node = builder.selectedNode.value;
			return node.name === "ButtonBlock" &&
				key === "size" &&
				isPlainRecord(node.props.content) &&
				!isBinding(node.props.content)
				? (node.props.content.size ?? node.props.size)
				: node.props[key];
		}
		function setProperty(key, value) {
			const node = builder.selectedNode.value;
			const props = { ...node.props, [key]: value };
			if (
				node.name === "ButtonBlock" &&
				key === "size" &&
				isPlainRecord(props.content) &&
				!isBinding(props.content)
			)
				props.content = { ...props.content, size: value };
			builder.updateNode(props);
		}
		// Removing the key lets the component default apply again.
		function removeProperty(key) {
			const { [key]: _removed, ...props } = builder.selectedNode.value.props;
			builder.updateNode(props);
		}
		async function addProperty(key) {
			if (!key) return;
			setProperty(key, propertyAddedValue(descriptors.value[key]));
			propertyFilter.value = "";
			setSectionOpen(`props-${groupOf(key)}`, true);
			await nextTick();
			const field = propertyToolbar.value?.parentElement?.querySelector(`[data-zb-property="${CSS.escape(key)}"]`);
			field?.scrollIntoView({ block: "nearest" });
			field?.querySelector(":scope > :not(.zb-field-heading) :is(input, textarea, select)")?.focus();
		}
		// Grouped catalog entries; a name outside the catalog (sourced or ZVP) stays listed as current.
		const typeItems = computed(() => {
			const name = builder.selectedNode.value?.name;
			const items = componentMenuItems(builder.translate).map((item) =>
				item.heading ? { ...item, id: "heading-" + item.heading } : { ...item, active: item.id === name },
			);
			return catalog.some((entry) => entry.name === name)
				? items
				: [{ id: name, label: name, active: true }, { id: "__separator", separator: true }, ...items];
		});
		const selectedTypeGroup = computed(() => {
			const entry = catalog.find((item) => item.name === builder.selectedNode.value?.name);
			return entry ? builder.translate(entry.group) : "";
		});
		function changeType(item) {
			builder.changeNodeType(item.id);
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
		function selectParent() {
			builder.selectInstance(builder.instanceId.value, null);
			builder.revealOutline(builder.instanceId.value);
		}
		return {
			...builder,
			sliderConfig,
			lightboxConfig,
			lightboxTrigger,
			overlayContent,
			repeaterPanel,
			mediaConfig,
			contentSlotsEditor,
			attributesEditor,
			filledSlots,
			attributeTotal,
			typeItems,
			selectedTypeGroup,
			iconHref,
			descriptors,
			visibleProperties,
			spreadField,
			spreadOverrides,
			groupedProperties,
			extraProperties,
			addItems,
			propertyFilter,
			propertyToolbar,
			propsDraft,
			propertyValue,
			setProperty,
			removeProperty,
			addProperty,
			changeType,
			clearProps,
			applyProps,
			selectParent,
		};
	},
});
</script>
