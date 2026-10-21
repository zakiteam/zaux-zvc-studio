<template>
	<ul
		ref="root"
		class="zb-sortable-list m-0 grid min-w-0 list-none gap-0.5 p-0"
		:aria-label="label"
		@dragover="dragOver"
		@dragleave="dragLeave"
		@drop="drop"
	>
		<li
			v-for="(item, index) in items"
			:key="keyOf(item, index)"
			:data-zb-list-index="index"
			class="relative min-w-0"
		>
			<!-- Drop line: before this row, or after the last one. -->
			<span
				v-if="dropIndex === index || (dropIndex === items.length && index === items.length - 1)"
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 z-10 h-[2px] rounded-full bg-zaux-accent"
				:class="dropIndex === index ? '-top-[2px]' : '-bottom-[2px]'"
			/>
			<div
				class="min-w-0"
				:class="[
					card ? 'rounded-xxs border-slim border-zaux-light-grey bg-zaux-white' : 'rounded-xs bg-zaux-light',
					dragged === index ? 'opacity-40' : '',
				]"
			>
				<div class="flex min-w-0 items-center gap-0.5 py-0.25 pl-0.25 pr-0.5">
					<button
						v-if="!disabled && items.length > 1"
						type="button"
						data-zb-list-handle
						draggable="true"
						class="grid h-[24px] w-[18px] shrink-0 cursor-grab place-items-center rounded-xxs text-[12px] text-zaux-dark-grey hover:bg-zaux-light-grey/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent active:cursor-grabbing"
						:title="translate('zx_builder_list_reorder')"
						:aria-label="`${translate('zx_builder_list_reorder')}: ${titleOf(item, index)}`"
						@dragstart="dragStart($event, index)"
						@dragend="clearDrag"
						@keydown.alt.up.prevent="run('up', index)"
						@keydown.alt.down.prevent="run('down', index)"
					><span aria-hidden="true">⠿</span></button>
					<span v-else class="w-[4px] shrink-0" aria-hidden="true" />
					<button
						v-if="collapsible"
						type="button"
						class="grid h-[24px] w-[20px] shrink-0 place-items-center rounded-xxs text-[10px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
						:aria-expanded="!collapsed.has(index)"
						:aria-label="translate(collapsed.has(index) ? 'zx_builder_expand' : 'zx_builder_collapse')"
						@click="toggle(index)"
					><span aria-hidden="true">{{ collapsed.has(index) ? "▸" : "▾" }}</span></button>
					<slot name="leading" :item="item" :index="index" />
					<button
						v-if="openable"
						type="button"
						class="min-w-0 flex-1 truncate py-0.5 text-left text-[11px]"
						:title="`${translate('zx_builder_overlay_edit')}: ${titleOf(item, index)}`"
						@click="$emit('open', index)"
					><slot name="label" :item="item" :index="index">{{ titleOf(item, index) }}</slot></button>
					<span v-else class="min-w-0 flex-1 truncate py-0.5 text-[11px] font-medium"><slot name="label" :item="item" :index="index">{{ titleOf(item, index) }}</slot></span>
					<slot name="actions" :item="item" :index="index" />
					<BuilderButton v-if="openable" variant="light" size="xs" icon="edit" iconOnly :label="`${translate('zx_builder_overlay_edit')}: ${titleOf(item, index)}`" @click="$emit('open', index)" />
					<BuilderButton variant="light" size="xs" icon="duplicate" iconOnly :label="`${translate('zx_builder_duplicate')}: ${titleOf(item, index)}`" :disabled="disabled" @click="run('duplicate', index)" />
					<BuilderButton variant="light" size="xs" icon="delete" iconOnly :label="`${translate(removeLabel)}: ${titleOf(item, index)}`" :disabled="disabled" @click="run('remove', index)" />
					<BuilderDropdown
						v-if="items.length > 1"
						:label="`${translate('zx_builder_list_more')}: ${titleOf(item, index)}`"
						icon="more-horizontal"
						iconOnly
						btnTheme="light"
						align="end"
						:disabled="disabled"
						:items="moveItems(index)"
						@select="run($event.id, index)"
					/>
				</div>
				<div v-if="collapsible && !collapsed.has(index)" class="grid min-w-0 gap-1 px-1.5 pb-1.5 pt-0.5">
					<slot name="body" :item="item" :index="index" />
				</div>
			</div>
		</li>
	</ul>
	<p v-if="!items.length && emptyText" class="text-[11px] text-zaux-dark-grey">{{ emptyText }}</p>
</template>
<script>
	import { defineComponent, nextTick, ref } from "vue";
	import { useTranslation } from "../../../../composables/useTranslation.js";
	import { clone } from "../../../../../domain/nodes.js";
	import { duplicateItem, moveItem, remapIndex, removeItem } from "../../../../../domain/list-ops.js";

	// Shared editor for ordered lists (repeater entries, slides, content slot items, overlay
	// children, lightbox items, CTA groups): drag handle (drag and drop, Alt+↑/↓), duplicate,
	// delete and a menu with move up/down/top/bottom. It never mutates `items`: every action
	// emits `change(list, op)`, op = { type: 'move', from, to } | { type: 'duplicate' | 'remove', index },
	// so parents commit the list or call their own API. `open(index)` asks to edit an entry;
	// `collapsible` rows show the `body` slot (index-keyed collapsed state follows the moves).
	export default defineComponent({
		name: "BuilderSortableList",
		props: {
			items: { type: Array, required: true },
			label: { type: String, default: "" },
			disabled: Boolean,
			openable: Boolean,
			collapsible: Boolean,
			// Card rows (bordered, for inline bodies) instead of the compact filled rows.
			card: Boolean,
			itemLabel: { type: Function, default: null },
			itemKey: { type: Function, default: null },
			duplicateWith: { type: Function, default: clone },
			removeLabel: { type: String, default: "zx_builder_delete" },
			emptyText: { type: String, default: "" },
		},
		emits: ["change", "open"],
		setup(props, { emit }) {
			const { translate } = useTranslation();
			const root = ref(null);
			const dragged = ref(null);
			const dropIndex = ref(null);
			const collapsed = ref(new Set());

			const keyOf = (item, index) => props.itemKey ? props.itemKey(item, index) : index;
			const titleOf = (item, index) => props.itemLabel?.(item, index) || String(index + 1);
			function moveItems(index) {
				const last = props.items.length - 1;
				return [
					{ id: "up", icon: "chevron-up", label: translate("zx_builder_move_up"), disabled: index === 0 },
					{ id: "down", icon: "chevron-down", label: translate("zx_builder_move_down"), disabled: index === last },
					{ id: "top", label: translate("zx_builder_list_move_top"), disabled: index === 0 },
					{ id: "bottom", label: translate("zx_builder_list_move_bottom"), disabled: index === last },
				];
			}
			function remapCollapsed(op) {
				collapsed.value = new Set([...collapsed.value].map((index) => remapIndex(index, op)).filter((index) => index !== null));
			}
			function apply(op) {
				const list = op.type === "move" ? moveItem(props.items, op.from, op.to)
					: op.type === "duplicate" ? duplicateItem(props.items, op.index, props.duplicateWith)
					: removeItem(props.items, op.index);
				if (list === props.items) return;
				if (op.type === "duplicate" && collapsed.value.has(op.index)) {
					remapCollapsed(op);
					collapsed.value.add(op.index + 1);
				} else remapCollapsed(op);
				emit("change", list, op);
			}
			async function run(action, index) {
				if (props.disabled) return;
				const last = props.items.length - 1;
				if (action === "duplicate" || action === "remove") { apply({ type: action, index }); return; }
				const to = { up: index - 1, down: index + 1, top: 0, bottom: last }[action];
				if (to === undefined || to < 0 || to > last || to === index) return;
				apply({ type: "move", from: index, to });
				// Keep keyboard users on the moved row.
				await nextTick();
				root.value?.querySelector(`[data-zb-list-index="${to}"] [data-zb-list-handle]`)?.focus();
			}
			function toggle(index) {
				const next = new Set(collapsed.value);
				if (next.has(index)) next.delete(index);
				else next.add(index);
				collapsed.value = next;
			}

			// Drag and drop stays inside this list: other drags (palette, canvas, other lists) are ignored.
			function dragStart(event, index) {
				dragged.value = index;
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("application/x-zaux-list-item", String(index));
				const row = event.target.closest("li");
				if (row) event.dataTransfer.setDragImage(row, 12, 12);
			}
			function dragOver(event) {
				if (dragged.value === null) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				const rows = [...(root.value?.children ?? [])].filter((row) => row.dataset.zbListIndex !== undefined);
				const before = rows.find((row) => {
					const rect = row.getBoundingClientRect();
					return event.clientY < rect.top + rect.height / 2;
				});
				dropIndex.value = before ? Number(before.dataset.zbListIndex) : props.items.length;
			}
			function dragLeave(event) {
				if (!root.value?.contains(event.relatedTarget)) dropIndex.value = null;
			}
			function drop(event) {
				if (dragged.value === null) return;
				event.preventDefault();
				const from = dragged.value;
				const position = dropIndex.value;
				clearDrag();
				if (position === null) return;
				// Insertion point -> final index once the dragged row is taken out.
				const to = position > from ? position - 1 : position;
				if (to !== from) apply({ type: "move", from, to });
			}
			function clearDrag() {
				dragged.value = null;
				dropIndex.value = null;
			}
			return { translate, root, dragged, dropIndex, collapsed, keyOf, titleOf, moveItems, run, toggle, dragStart, dragOver, dragLeave, drop, clearDrag };
		},
	});
</script>
