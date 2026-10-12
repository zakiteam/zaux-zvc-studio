<template>
	<div class="grid min-w-0 gap-2">
		<template v-if="list && selected !== null && entries[selected]">
			<BuilderButton
				size="xs"
				icon="chevron-left"
				variant="alt1"
				:label="translate('zx_builder_component_back')"
				@click="selected = null"
			/>
			<p class="text-[11px] font-medium">{{ selected + 1 }} · {{ entryLabel(entries[selected]) }}</p>
		</template>
		<template v-else-if="list">
			<p v-if="!entries.length" class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_component_empty") }}</p>
			<div
				v-for="(entry, index) in entries"
				:key="index"
				class="flex items-center gap-1 py-1 pl-2 pr-1 bg-zaux-light rounded-xs"
			>
				<button type="button" class="flex-1 min-w-0 text-left text-[11px] truncate" @click="selected = index">
					{{ index + 1 }} · {{ entryLabel(entry) }}
				</button>
				<BuilderButton variant="light" size="xs" icon="edit" iconOnly :label="translate('zx_builder_overlay_edit')" :disabled="disabled" @click="selected = index" />
				<BuilderButton variant="light" size="xs" icon="chevron-up" iconOnly :label="translate('zx_builder_move_up')" :disabled="disabled || index === 0" @click="move(index, -1)" />
				<BuilderButton variant="light" size="xs" icon="chevron-down" iconOnly :label="translate('zx_builder_move_down')" :disabled="disabled || index === entries.length - 1" @click="move(index, 1)" />
				<BuilderButton variant="light" size="xs" icon="copy" iconOnly :label="translate('zx_builder_duplicate')" :disabled="disabled" @click="duplicate(index)" />
				<BuilderButton variant="light" size="xs" icon="delete" iconOnly :label="translate('zx_builder_delete')" :disabled="disabled" @click="remove(index)" />
			</div>
			<BuilderDropdown
				:label="translate('zx_builder_component_add')"
				:items="menuItems"
				:filterItems="true"
				:disabled="disabled"
				@select="choose($event, entries.length)"
			/>
		</template>
		<div v-else class="flex items-center gap-1">
			<p v-if="current" class="flex-1 min-w-0 py-1 pl-2 text-[11px] truncate bg-zaux-light rounded-xs">{{ entryLabel(current) }}</p>
			<BuilderDropdown
				:class="current ? '' : 'flex-1'"
				:label="translate(current ? 'zx_builder_component_change' : 'zx_builder_component_choose')"
				:items="menuItems"
				:filterItems="true"
				:disabled="disabled"
				@select="choose($event, 0)"
			/>
			<BuilderButton v-if="current" variant="light" size="xs" icon="delete" iconOnly :label="translate('zx_builder_delete')" :disabled="disabled" @click="clear" />
		</div>

		<template v-if="current">
			<BuilderComponentItem
				v-if="single(current)"
				:key="`${index}-${single(current).name}`"
				:item="single(current)"
				:label="entryLabel(current)"
				:json="false"
				@change="setEntry(index, contentSlotValue([$event]))"
			/>
			<p v-else class="text-[11px] text-zaux-dark-grey">{{ translate("zx_builder_component_group_hint") }}</p>
			<template v-if="partialOf(current)">
				<BuilderButton size="xs" :label="translate('zx_builder_component_bake')" :disabled="disabled" @click="bake(index)" />
				<p class="text-[10px] leading-[1.5] text-zaux-dark-grey">{{ translate("zx_builder_component_bake_hint") }}</p>
			</template>
		</template>

		<details>
			<summary class="text-[11px]">{{ translate("zx_builder_advanced") }} · JSON</summary>
			<BuilderValue type="json" :modelValue="modelValue" :label="label" :disabled="disabled" @update:modelValue="emitValue" />
		</details>
	</div>
</template>
<script>
	import { computed, defineComponent, ref, watch } from "vue";
	import { useBuilder } from "../../../composables/useBuilder.js";
	import { useTranslation } from "../../../composables/useTranslation.js";
	import { componentDescriptor, componentLabel, componentMenuItems } from "../../../services/catalog.js";
	import { clone } from "../../../../domain/nodes.js";
	import { isPlainRecord } from "../../../../domain/slider.js";
	import { bakePartial, contentSlotItems, contentSlotValue } from "../../../../domain/content-slots.js";

	// Value of a `component` field: one Zaux { type, name, props } descriptor, or an
	// array of them (list mode, as in Zaux's `params.mode: 'array'`). Descriptors with
	// children are grouped under ComponentsRenderer so every renderer keeps the tree.
	// ZVPs are stored as references (the owner captures an independent copy) or baked
	// into plain Zaux descriptors.
	export default defineComponent({
		name: "BuilderComponentInput",
		props: {
			modelValue: { default: null },
			label: String,
			disabled: Boolean,
		},
		emits: ["update:modelValue"],
		setup(props, { emit }) {
			const { translate } = useTranslation();
			const builder = useBuilder();
			const selected = ref(null);
			const list = computed(() => Array.isArray(props.modelValue));
			const entries = computed(() =>
				list.value ? props.modelValue : isPlainRecord(props.modelValue) && props.modelValue.name ? [props.modelValue] : [],
			);
			const index = computed(() => (list.value ? selected.value : 0));
			const current = computed(() => (index.value === null ? null : entries.value[index.value] ?? null));
			watch(() => entries.value.length, (length) => {
				if (selected.value !== null && selected.value >= length) selected.value = null;
			});
			const menuItems = computed(() => componentMenuItems(translate, builder.selectablePartials.value));

			// The editable descriptor of an entry: itself, or the only item of its group.
			function single(entry) {
				const items = contentSlotItems(entry);
				return items?.length === 1 && isPlainRecord(items[0]) ? items[0] : null;
			}
			function partialOf(entry) {
				const item = single(entry);
				return item ? builder.availablePartials.value.find((partial) => partial.exportName === item.name) ?? null : null;
			}
			function entryLabel(entry) {
				const items = contentSlotItems(entry);
				if (items?.length === 1) return componentLabel(items[0], builder.availablePartials.value);
				return `${entry?.name ?? ""} (${items?.length ?? 0})`;
			}
			function emitValue(value) {
				if (!props.disabled) emit("update:modelValue", clone(value));
			}
			function setEntry(position, entry) {
				if (!list.value) return emitValue(entry);
				const next = [...entries.value];
				next[position] = entry;
				emitValue(next);
			}
			function choose(item, position) {
				let descriptor;
				try {
					descriptor = contentSlotValue([componentDescriptor(item.id, builder.availablePartials.value)]);
				} catch (exception) {
					builder.error.value = exception.message;
					return;
				}
				setEntry(position, descriptor);
				if (list.value) selected.value = position;
			}
			function bake(position) {
				const entry = entries.value[position];
				const partial = partialOf(entry);
				if (!partial) return;
				try {
					setEntry(position, bakePartial(partial, single(entry).props ?? {}));
				} catch (exception) {
					builder.error.value = exception.message;
				}
			}
			function clear() { emitValue({}); }
			function duplicate(position) {
				const next = [...entries.value];
				next.splice(position + 1, 0, clone(next[position]));
				emitValue(next);
			}
			function remove(position) { emitValue(entries.value.filter((_, item) => item !== position)); }
			function move(position, delta) {
				const target = position + delta;
				if (target < 0 || target >= entries.value.length) return;
				const next = [...entries.value];
				[next[position], next[target]] = [next[target], next[position]];
				emitValue(next);
			}
			return {
				translate, selected, list, entries, index, current, menuItems, contentSlotValue, single, partialOf,
				entryLabel, emitValue, setEntry, choose, bake, clear, duplicate, remove, move,
			};
		},
	});
</script>
