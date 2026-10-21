<template>
	<section class="grid gap-1.5">
		<template v-if="selectedItem">
			<div class="grid gap-2 rounded-xs bg-zaux-light/50 p-2 outline outline-1 outline-zaux-light-grey">
				<div class="flex min-w-0 items-center gap-1">
					<BuilderButton
						size="xs"
						icon="chevron-left"
						iconOnly
						variant="light"
						:label="translate('zx_builder_content_slot_back')"
						@click="selected = null"
					/>
					<p class="flex min-w-0 flex-1 items-center gap-0.5 text-[11px]">
						<span class="truncate text-zaux-dark-grey">{{ hookLabel(selected.key) }}</span>
						<span aria-hidden="true" class="text-zaux-dark-grey">›</span>
						<strong class="truncate font-semibold">{{ itemLabel(selectedItem) }}</strong>
					</p>
					<span class="shrink-0 rounded-xxs px-0.75 py-0.25 text-[9px] font-semibold uppercase tracking-wider" :class="kindClass(selectedItem)">{{ kindLabel(selectedItem) }}</span>
				</div>
				<BuilderComponentItem
					:key="selected.key + selected.index"
					:item="selectedItem"
					:label="itemLabel(selectedItem)"
					:reference="selectedItem"
					:bindings="bindings"
					@change="updateItem"
				/>
			</div>
		</template>
		<template v-else>
			<p class="text-[10px] leading-[1.5] text-zaux-dark-grey">{{ translate("zx_builder_content_slots_hint") }}</p>
			<div
				v-for="contentSlot in slots"
				:key="contentSlot.key"
				class="rounded-xs border-slim"
				:class="contentSlot.items?.length ? 'border-zaux-light-grey bg-zaux-white' : 'border-dashed border-zaux-light-grey'"
			>
				<div class="flex min-w-0 items-center gap-1 px-1.5 py-1">
					<div class="min-w-0 flex-1">
						<p class="flex min-w-0 items-center gap-1 text-[11px] font-medium">
							<span class="truncate">{{ hookLabel(contentSlot.key) }}</span>
							<span v-if="contentSlot.items?.length" class="shrink-0 rounded-xxs bg-zaux-accent/15 px-0.75 text-[9px] font-semibold text-zaux-accent">{{ contentSlot.items.length }}</span>
						</p>
						<code class="block truncate font-mono text-[9px] text-zaux-dark-grey">{{ contentSlot.key }}</code>
					</div>
					<template v-if="contentSlot.items">
						<BuilderDropdown
							:label="translate('zx_builder_content_slot_add_component')"
							:items="componentItems"
							filterItems
							align="end"
							@select="add(contentSlot, $event, false)"
						>
							<template #trigger="{ open, menuId }">
								<button
									type="button"
									class="flex shrink-0 items-center gap-0.5 rounded-xxs bg-zaux-light px-1 py-0.5 text-[10px] font-medium text-zaux-dark hover:bg-zaux-accent/10 hover:text-zaux-accent"
									:title="translate('zx_builder_content_slot_add_component')"
									:aria-label="`${translate('zx_builder_content_slot_add_component')}: ${contentSlot.key}`"
									:aria-expanded="open"
									aria-haspopup="menu"
									:aria-controls="menuId"
								>
									<svg class="h-[10px] w-[10px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'plus')" /></svg>
									{{ translate("zx_builder_content_slot_component") }}
								</button>
							</template>
						</BuilderDropdown>
						<BuilderDropdown
							v-if="partialItems.length"
							:label="translate('zx_builder_content_slot_add_partial')"
							:items="partialItems"
							:filterItems="partialItems.length > 8"
							align="end"
							@select="add(contentSlot, $event, true)"
						>
							<template #trigger="{ open, menuId }">
								<button
									type="button"
									class="flex shrink-0 items-center gap-0.5 rounded-xxs bg-zaux-light px-1 py-0.5 text-[10px] font-medium text-zaux-dark hover:bg-zaux-accent/10 hover:text-zaux-accent"
									:title="translate('zx_builder_content_slot_add_partial')"
									:aria-label="`${translate('zx_builder_content_slot_add_partial')}: ${contentSlot.key}`"
									:aria-expanded="open"
									aria-haspopup="menu"
									:aria-controls="menuId"
								>
									<svg class="h-[10px] w-[10px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'plus')" /></svg>
									ZVP
								</button>
							</template>
						</BuilderDropdown>
						<button
							v-else
							type="button"
							disabled
							class="flex shrink-0 items-center gap-0.5 rounded-xxs bg-zaux-light px-1 py-0.5 text-[10px] font-medium"
							:title="translate('zx_builder_content_slot_no_partials')"
						>+ ZVP</button>
					</template>
				</div>
				<p v-if="contentSlot.hintKey" class="px-1.5 pb-1 text-[10px] leading-[1.5] text-utility-warning">{{ translate(contentSlot.hintKey) }}</p>
				<p v-if="!contentSlot.items" class="px-1.5 pb-1 text-[10px] text-zaux-dark-grey">{{ translate("zx_builder_slider_unknown") }}</p>
				<div v-else-if="contentSlot.items.length" class="border-t-slim border-zaux-light-grey p-0.5">
					<BuilderSortableList
						:items="contentSlot.items"
						:label="hookLabel(contentSlot.key)"
						openable
						:itemLabel="(item) => itemLabel(item)"
						@open="select(contentSlot.key, $event)"
						@change="(items) => commit(contentSlot.key, items)"
					>
						<template #leading="{ item }">
							<span class="shrink-0 rounded-xxs px-0.5 text-[8px] font-semibold uppercase tracking-wider" :class="kindClass(item)">{{ kindLabel(item) }}</span>
						</template>
					</BuilderSortableList>
				</div>
			</div>
			<p v-if="otherKeys.length" class="text-[10px] text-zaux-dark-grey">
				{{ translate("zx_builder_content_slot_other", { keys: otherKeys.join(", ") }) }}
			</p>
		</template>
	</section>
</template>
<script>
	import { computed, defineComponent, nextTick, ref, watch } from "vue";
	import { useBuilder } from "../../../../composables/useBuilder.js";
	import { catalog, componentDescriptor, componentLabel, componentMenuItems } from "../../../../services/catalog.js";
	import { iconHref } from "@integration/options/icon-options.js";
	import { isPlainRecord } from "../../../../../domain/slider.js";
	import { contentSlotItems, setContentSlot } from "../../../../../domain/content-slots.js";
	import { contentSlotConfig } from "../../../../../integrations/zaux/controls/content-slot-controls.js";
	import { hookLabel } from "../../../../../integrations/zaux/controls/hook-registry.js";

	// Edits a component's contentSlots prop: each slot (from the generated content-hooks
	// registry) holds Zaux/HTML components and ZVP partials as JSON descriptors,
	// stored in the Zaux { name, props } shape.
	export default defineComponent({
		name: "BuilderContentSlots",
		props: { node: Object },
		setup(props) {
			const builder = useBuilder();
			const { translate } = builder;
			const selected = ref(null);
			const bindings = computed(() => builder.activeDefinition.value?.fields ?? []);
			const contentSlots = computed(() => props.node?.props?.contentSlots);
			const slots = computed(() =>
				(contentSlotConfig(props.node?.name, props.node?.props ?? {}) ?? []).map((slot) => ({
					...slot,
					items: contentSlotItems(isPlainRecord(contentSlots.value) ? contentSlots.value[slot.key] : null),
				})),
			);
			// Authored keys the current configuration does not list (other modes, older data) stay untouched.
			const otherKeys = computed(() =>
				isPlainRecord(contentSlots.value)
					? Object.keys(contentSlots.value).filter((key) => !slots.value.some((slot) => slot.key === key))
					: [],
			);
			const selectedItem = computed(() => {
				if (!selected.value) return null;
				const slot = slots.value.find((entry) => entry.key === selected.value.key);
				return slot?.items?.[selected.value.index] ?? null;
			});
			watch(selectedItem, (item) => { if (!item) selected.value = null; });
			const componentItems = computed(() => componentMenuItems(translate));
			const partialItems = computed(() =>
				builder.selectablePartials.value.map((partial) => ({ id: partial.exportName, label: partial.name })),
			);
			function partialOf(item) {
				return builder.availablePartials.value.find((entry) => entry.exportName === item?.name);
			}
			function itemLabel(item) {
				if (item?.name === "ComponentsRenderer") return translate("zx_builder_content_slot_group", { count: item.props?.components?.length ?? 0 });
				return componentLabel(item, builder.availablePartials.value) || translate("zx_builder_content_slot_item");
			}
			function kind(item) {
				if (partialOf(item)) return "zvp";
				if (item?.name === "ComponentsRenderer") return "group";
				return catalog.find((entry) => entry.name === item?.name)?.html ? "html" : "zaux";
			}
			const kindLabels = { zvp: "ZVP", group: "zx_builder_content_slot_kind_group", html: "HTML", zaux: "Vue" };
			const kindClasses = {
				zvp: "bg-zaux-accent/15 text-zaux-accent",
				group: "bg-zaux-light-grey/50 text-zaux-dark",
				html: "bg-zaux-light text-zaux-dark-grey",
				zaux: "bg-zaux-dark/10 text-zaux-dark",
			};
			const kindLabel = (item) => translate(kindLabels[kind(item)]);
			const kindClass = (item) => kindClasses[kind(item)];
			function commit(key, items) {
				builder.updateNode({ ...props.node.props, contentSlots: setContentSlot(contentSlots.value, key, items) });
			}
			function select(key, index) { selected.value = { key, index }; }
			// Components resolve from the catalog only; ZVPs only from the partial list.
			async function add(slot, item, partial) {
				let descriptor;
				try {
					descriptor = componentDescriptor(item.id, partial ? builder.availablePartials.value : []);
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
			return {
				translate, iconSet: builder.iconSet, iconHref, hookLabel, selected, bindings, slots, otherKeys, selectedItem,
				componentItems, partialItems, itemLabel, kindLabel, kindClass, commit, select, add, updateItem,
			};
		},
	});
</script>
