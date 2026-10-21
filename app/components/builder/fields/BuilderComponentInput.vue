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
			<BuilderSortableList
				:items="entries"
				:label="label"
				:disabled="disabled"
				openable
				:itemLabel="(entry, position) => `${position + 1} · ${entryLabel(entry)}`"
				:emptyText="translate('zx_builder_component_empty')"
				@open="selected = $event"
				@change="emitValue"
			/>
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
			// Repeater whitelist (field params.allowed): component names offered by the add menu.
			allowed: { type: Array, default: null },
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
			const menuItems = computed(() => {
				const items = componentMenuItems(translate, builder.selectablePartials.value);
				if (!props.allowed?.length) return items;
				// Keep the allowed entries plus the heading (and separator) of each group that still has some.
				const result = [];
				let pending = [];
				for (const item of items) {
					if (item.heading) pending = [...pending.filter((other) => other.separator), item];
					else if (item.separator) pending.push(item);
					else if (props.allowed.includes(item.id)) {
						result.push(...pending.filter((other) => result.length || !other.separator), item);
						pending = [];
					}
				}
				return result;
			});

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
			return {
				translate, selected, list, entries, index, current, menuItems, contentSlotValue, single, partialOf,
				entryLabel, emitValue, setEntry, choose, bake, clear,
			};
		},
	});
</script>
