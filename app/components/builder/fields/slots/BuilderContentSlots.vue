<template>
	<section class="grid gap-3 mb-2.5">
		<template v-if="selectedItem">
			<div class="flex flex-col gap-2 p-3 bg-zaux-light/50 outline outline-zaux-light-grey rounded-xs">
				<BuilderButton
					class="mb-2"
					size="s"
					icon="chevron-left"
					variant="alt1"
					:label="translate('zx_builder_content_slot_back')"
					@click="selected = null"
				/>
				<p class="text-cta-m font-builder">
					{{ selected.key }} · {{ selected.index + 1 }} · {{ itemLabel(selectedItem) }}
				</p>
				<BuilderPartialFields
					v-if="selectedPartial && isPlainRecord(selectedItem.props)"
					:key="selected.key + selected.index"
					:definition="selectedPartial"
					:reference="selectedItem"
					:bindings="bindings"
					:modelValue="selectedItem.props"
					@change="updateItem({ ...selectedItem, props: $event })"
				/>
				<template v-else-if="isPlainRecord(selectedItem.props ?? {})">
					<BuilderProperty
						v-for="property in itemProperties"
						:key="`${selected.key}-${selected.index}-${selectedItem.name}-${property}`"
						:property="property"
						:value="selectedItem.props[property]"
						:fields="bindings"
						:descriptor="descriptors[property]"
						@change="setProperty(property, $event)"
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
				<details>
					<summary>{{ translate("zx_builder_advanced") }}</summary>
					<BuilderValue
						:key="selected.key + selected.index"
						type="json"
						:modelValue="selectedItem"
						:label="itemLabel(selectedItem)"
						@update:modelValue="updateItem"
					/>
				</details>
			</div>
		</template>
		<template v-else>
			<div v-for="contentSlot in slots" :key="contentSlot.key" class="grid gap-2">
				<p class="text-[12px] font-medium">
					{{ translate("zx_builder_content_slot") }} · <code>{{ contentSlot.key }}</code>
					<template v-if="contentSlot.items">({{ contentSlot.items.length }})</template>
				</p>
				<p v-if="contentSlot.hintKey" class="text-[10px] text-zaux-dark-grey">{{ translate(contentSlot.hintKey) }}</p>
				<p v-if="!contentSlot.items" class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_slider_unknown") }}</p>
				<template v-else>
					<p v-if="!contentSlot.items.length" class="text-[11px] text-zaux-dark-grey">
						{{ translate("zx_builder_overlay_empty") }}
					</p>
					<div
						v-for="(item, index) in contentSlot.items"
						:key="index"
						class="flex flex-wrap items-center gap-1 py-1 pl-2 pr-1 bg-zaux-light rounded-xs"
					>
						<button type="button" class="flex-1 min-w-0 text-left truncate" @click="select(contentSlot.key, index)">
							{{ index + 1 }} · {{ itemLabel(item) }}
						</button>
						<BuilderButton variant="light" icon="edit" size="xs" :label="translate('zx_builder_overlay_edit')" @click="select(contentSlot.key, index)" />
						<BuilderButton variant="light" size="xs" icon="chevron-up" iconOnly :label="translate('zx_builder_move_up')" :disabled="index === 0" @click="move(contentSlot, index, -1)" />
						<BuilderButton variant="light" size="xs" icon="chevron-down" iconOnly :label="translate('zx_builder_move_down')" :disabled="index === contentSlot.items.length - 1" @click="move(contentSlot, index, 1)" />
						<BuilderButton variant="light" size="xs" icon="copy" iconOnly :label="translate('zx_builder_duplicate')" @click="duplicate(contentSlot, index)" />
						<BuilderButton variant="light" size="xs" icon="delete" iconOnly :label="translate('zx_builder_delete')" @click="remove(contentSlot, index)" />
					</div>
					<BuilderDropdown
						:label="translate('zx_builder_overlay_add')"
						:items="contentItems"
						:filterItems="true"
						@select="add(contentSlot, $event)"
					/>
				</template>
			</div>
		</template>
	</section>
</template>
<script>
	import { computed, defineComponent, nextTick, ref, watch } from "vue";
	import { useBuilder } from "../../../../composables/useBuilder.js";
	import { useTranslation } from "../../../../composables/useTranslation.js";
	import { catalog, catalogNode, propertyInfo } from "../../../../services/catalog.js";
	import { clone } from "../../../../../domain/nodes.js";
	import { isPlainRecord } from "../../../../../domain/slider.js";
	import { contentSlotDescriptor, contentSlotItems, setContentSlot } from "../../../../../domain/content-slots.js";
	import { contentSlotControls } from "../../../../../integrations/zaux/controls/content-slot-controls.js";
	import BuilderButton from "../../BuilderButton.vue";
	import BuilderDropdown from "../../BuilderDropdown.vue";
	import BuilderInput from "../BuilderInput.vue";
	import BuilderValue from "../BuilderValue.vue";
	import BuilderProperty from "../BuilderProperty.vue";
	import BuilderPartialFields from "../BuilderPartialFields.vue";

	// Edits a component's contentSlots prop: each slot holds catalog components
	// and ZVP partials as JSON descriptors, stored in the Zaux { name, props } shape.
	export default defineComponent({
		name: "BuilderContentSlots",
		components: { BuilderButton, BuilderDropdown, BuilderInput, BuilderValue, BuilderProperty, BuilderPartialFields },
		props: { node: Object },
		setup(props) {
			const { translate } = useTranslation();
			const builder = useBuilder();
			const selected = ref(null);
			const bindings = computed(() => builder.activeDefinition.value?.fields ?? []);
			const contentSlots = computed(() => props.node?.props?.contentSlots);
			const slots = computed(() =>
				(contentSlotControls[props.node?.name]?.slots(props.node?.props ?? {}) ?? []).map((slot) => ({
					...slot,
					items: contentSlotItems(isPlainRecord(contentSlots.value) ? contentSlots.value[slot.key] : null),
				})),
			);
			const selectedItem = computed(() => {
				if (!selected.value) return null;
				const slot = slots.value.find((entry) => entry.key === selected.value.key);
				return slot?.items?.[selected.value.index] ?? null;
			});
			watch(selectedItem, (item) => { if (!item) selected.value = null; });
			const selectedPartial = computed(() =>
				builder.availablePartials.value.find((item) => item.exportName === selectedItem.value?.name),
			);
			const descriptors = computed(() => {
				const trees = builder.mode.value === "library"
					? [builder.activeDefinition.value?.tree ?? []]
					: (builder.activeTemplate.value?.instances ?? []).map((instance) => instance.definition.tree);
				return selectedItem.value ? propertyInfo(selectedItem.value.name, { props: selectedItem.value.props ?? {}, trees }) : {};
			});
			const itemProperties = computed(() => Object.keys(selectedItem.value?.props ?? {}));
			const extraProperties = computed(() =>
				Object.keys(descriptors.value).filter((key) => !Object.hasOwn(selectedItem.value?.props ?? {}, key)).sort(),
			);
			const contentItems = computed(() => {
				const zaux = catalog.filter((entry) => !entry.html);
				const html = catalog.filter((entry) => entry.html);
				const partials = builder.selectablePartials.value.map((item) => ({ id: item.exportName, label: item.name + " (ZVP)" }));
				return [
					...(zaux.length ? [{ heading: translate("zx_builder_zaux") }] : []),
					...zaux.map((entry) => ({ id: entry.name, label: entry.name })),
					...(html.length ? [{ heading: translate("zx_builder_native") }] : []),
					...html.map((entry) => ({ id: entry.name, label: entry.name })),
					...(partials.length ? [{ separator: true }, { heading: translate("zx_builder_partials") }] : []),
					...partials,
				];
			});
			function itemLabel(item) {
				const partial = builder.availablePartials.value.find((entry) => entry.exportName === item?.name);
				return partial ? partial.name + " (ZVP)" : item?.name || translate("zx_builder_content_slot_item");
			}
			function commit(key, items) {
				builder.updateNode({ ...props.node.props, contentSlots: setContentSlot(contentSlots.value, key, items) });
			}
			function select(key, index) { selected.value = { key, index }; }
			async function add(slot, item) {
				const partial = builder.availablePartials.value.find((entry) => entry.exportName === item.id);
				let descriptor;
				try {
					descriptor = partial ? { type: "component", name: partial.exportName, props: {} } : contentSlotDescriptor(catalogNode(item.id));
				} catch (exception) {
					builder.error.value = exception.message;
					return;
				}
				const index = slot.items.length;
				commit(slot.key, [...slot.items, descriptor]);
				await nextTick();
				select(slot.key, index);
			}
			function updateItem(item) {
				if (!isPlainRecord(item) || !selected.value) return;
				const slot = slots.value.find((entry) => entry.key === selected.value.key);
				if (!slot?.items) return;
				commit(slot.key, slot.items.map((entry, index) => index === selected.value.index ? item : entry));
			}
			function setProperty(key, value) {
				updateItem({ ...selectedItem.value, props: { ...selectedItem.value.props, [key]: value } });
			}
			function addProperty(event) {
				const key = event.target.value;
				if (!key) return;
				const descriptor = descriptors.value[key];
				const value = descriptor?.default;
				setProperty(key, typeof value === "function"
					? descriptor.type === Array ? [] : descriptor.type === Object ? {} : null
					: value === undefined ? "" : clone(value));
				event.target.value = "";
			}
			function duplicate(slot, index) {
				const items = [...slot.items];
				items.splice(index + 1, 0, clone(items[index]));
				commit(slot.key, items);
			}
			function remove(slot, index) {
				commit(slot.key, slot.items.filter((_, position) => position !== index));
			}
			function move(slot, index, delta) {
				const target = index + delta;
				if (target < 0 || target >= slot.items.length) return;
				const items = [...slot.items];
				[items[index], items[target]] = [items[target], items[index]];
				commit(slot.key, items);
			}
			return {
				translate, selected, bindings, slots, selectedItem, selectedPartial, descriptors, itemProperties,
				extraProperties, contentItems, isPlainRecord, itemLabel, select, add, updateItem, setProperty,
				addProperty, duplicate, remove, move,
			};
		},
	});
</script>
