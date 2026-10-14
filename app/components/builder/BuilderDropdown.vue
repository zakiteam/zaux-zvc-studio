<template>		<div ref="root" class="zb-builder-dropdown">
		<div ref="trigger" @keydown="triggerKeydown" @keyup.stop @click="triggerClick" @contextmenu="contextMenuOpen">
			<slot name="trigger" :open="open" :menu-id="menuId">
			<BuilderButton
				size="xs"
				:variant="btnTheme ?? 'primary'"
				:label="label"
				:swatch="swatch"
				:title="label"
				:icon="icon"
				:iconOnly="iconOnly"
				:disabled="disabled"
				:aria-expanded="open"
				aria-haspopup="menu"
				:aria-controls="menuId"
				class="[&_*]:truncate"
				v-bind="{
					actionIcon : true,
					hasIcon : false,
					actionIconName : icon,
					...extraTriggerProps
				}"
			/>	
			</slot>
		</div>
		<!-- Context menus leave the row (no bubbling into outline handlers); dropdowns stay in place so
		     ancestor selectors and modal dialogs still apply. Both render in the top layer via the Popover API. -->
		<Teleport to="body" :disabled="!contextMenu">
			<div
				v-if="open"
				:id="menuId"
				ref="menu"
				popover="manual"
				role="menu"
				:aria-label="label"
				:class="contentClass"
				class="zb-builder-dropdown-content fixed z-[1000] m-0 flex w-[280px] flex-col px-0 py-1 pb-2 max-w-[calc(100vw-16px)] overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white font-builder text-zaux-dark dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] shadow-deeper"
				@keydown="menuKeydown"
				@keyup.stop
				@focusout="focusOut"
			>
				<div
					v-if="$slots.header"
					role="presentation"
					class="shrink-0 px-2 py-2 mb-2 border-b-slim border-zaux-light-grey"
				>
					<slot name="header" />
				</div>
				<div v-if="filterItems" ref="filterWrap" role="presentation" class="shrink-0 px-2 pt-1 pb-2">
					<BuilderInput
						v-model="query"
						type="search"
						autocomplete="off"
						class="w-full rounded-xxs text-[11px]"
						:placeholder="translate('zx_builder_dropdown_filter_placeholder')"
						:label="translate('zx_builder_dropdown_filter')"
					/>
				</div>
				<div class="min-h-0 max-h-[min(60dvh,420px)] overflow-y-auto px-2 flex flex-col gap-1">
					<template v-for="item in visibleItems" :key="item.id">
						<div
							v-if="item.separator"
							role="separator"
							class="my-1 border-t-slim border-zaux-light-grey"
						/>
						<p
							v-if="item.heading"
							role="presentation"
							class="px-0 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey"
						>
							{{ item.heading }}
						</p>
						<!-- A separator or heading precedes its item; one without a label is decoration only. -->
						<BuilderButton
							v-if="item.label || !(item.separator || item.heading)"
							role="menuitem"
							variant="alt1"
							tabindex="-1"
							:label="item.label"
							:swatch="item.swatch"
							:title="item.label"
							:icon="item.icon"
							:iconHref="item.iconHref"
							:extraProps="{
								inheritedUIFlags : {
									'HOVER' : item.active
								},
								...(item.shortcut ? { customInnerClasses : 'flex w-full', customInnerWrapperClasses : 'w-full' } : {})
							}"
							:disabled="disabled || item.disabled"
							:aria-current="item.active ? 'true' : undefined"
							:aria-keyshortcuts="item.ariaShortcut"
							class="!flex !w-full !justify-start !whitespace-normal"
							:class="[
								item.danger && '[&.zb-button]:!text-utility-error',
								item?.class
							]"
							@click="select(item)"
						>
							<template v-if="item.shortcut" #afterLabel>
								<kbd aria-hidden="true" class="ml-auto shrink-0 pl-3 font-builder text-[10px] font-normal text-zaux-dark-grey">{{ item.shortcut }}</kbd>
							</template>
						</BuilderButton>
					</template>
					<p
						v-if="filterItems && query && !visibleItems.length"
						role="presentation"
						class="px-0 py-1.5 text-[11px] text-zaux-dark-grey"
					>
						{{ translate('zx_builder_dropdown_no_results') }}
					</p>
				</div>
			</div>
		</Teleport>
	</div>
</template>
<script>
import { defineComponent, ref, computed, nextTick, watch, useId, provide, onBeforeUnmount } from "vue";
import { useTranslation } from "../../composables/useTranslation.js";
// Distance from the trigger and minimum margin from the viewport edges, in px.
const GAP = 4;
const EDGE = 8;
export default defineComponent({
	props: {
		btnTheme : { default : 'secondary' },
		label: { type: String, required: true },
		icon: { type: String, default: "dropdown-bottom" },
		iconOnly: Boolean,
		contextMenu: Boolean,
		contentClass: { type: String, default: "" },
		swatch: String,
		items: { type: Array, default: () => [] },
		filterItems: Boolean,
		disabled: Boolean,
		align: { default: "start" },
		// Preferred side; the menu flips when the other side has more room.
		side: { default: "bottom" },
		extraTriggerProps : { default : null },
		btnSize : { default : 's' }
	},
	emits: ["select", "contextmenu"],
	setup(props, { emit }) {
		const { translate } = useTranslation();
		const root = ref(null);
		const trigger = ref(null);
		const menu = ref(null);
		const open = ref(false);
		const menuId = useId();
		const filterWrap = ref(null);
		const query = ref("");
		// ZButton flips its action icon while the enclosing menu is open.
		provide('actionActive', open);
		// Viewport point for context menus; null anchors the menu to the trigger.
		let point = null;
		let frame = 0;
		let observer = null;
		const visibleItems = computed(() => {
			const items = props.items.filter((item) => item.hidden !== true);
			const needle = props.filterItems ? query.value.trim().toLowerCase() : "";
			if (!needle) return items;
			return items
				.filter(
					(item) =>
						!item.separator &&
						String(item.label ?? "").toLowerCase().includes(needle),
				)
				.map((item) => (item.heading ? { ...item, heading: undefined } : item));
		});
		const filterField = () => filterWrap.value?.querySelector("input") ?? null;
		const buttons = () => [
			...(menu.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') ??
				[]),
		];
		// Places the menu on the preferred side, flips when the other side has more room,
		// limits its height to the available space and keeps it inside the viewport.
		function place() {
			const el = menu.value;
			if (!open.value || !el) return;
			const rect = point
				? { top: point.y, bottom: point.y, left: point.x, right: point.x }
				: trigger.value?.getBoundingClientRect();
			if (!rect) return;
			if (!point && (rect.bottom < 0 || rect.top > window.innerHeight || (!rect.width && !rect.height))) {
				close();
				return;
			}
			const gap = point ? 0 : GAP;
			const viewWidth = document.documentElement.clientWidth;
			const viewHeight = window.innerHeight;
			el.style.maxHeight = "";
			const { width, height } = el.getBoundingClientRect();
			const below = viewHeight - rect.bottom - gap - EDGE;
			const above = rect.top - gap - EDGE;
			const upward = props.side === "top"
				? height <= above || (height > below && above >= below)
				: height > below && (height <= above || above > below);
			const room = Math.max(upward ? above : below, 0);
			const finalHeight = Math.min(height, room);
			if (height > room) el.style.maxHeight = `${room}px`;
			const y = upward ? rect.top - gap - finalHeight : rect.bottom + gap;
			const x = props.align === "end" ? rect.right - width : rect.left;
			el.style.inset = "auto";
			el.style.left = `${Math.max(EDGE, Math.min(x, viewWidth - width - EDGE))}px`;
			el.style.top = `${Math.max(EDGE, Math.min(y, viewHeight - finalHeight - EDGE))}px`;
		}
		function schedule() {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				place();
			});
		}
		function outsidePointer(event) {
			if (!root.value?.contains(event.target) && !menu.value?.contains(event.target)) close();
		}
		// Context menus close on outside scroll like native ones; dropdowns follow their trigger.
		function viewportChange(event) {
			if (event.type === "scroll" && menu.value?.contains(event.target)) return;
			if (props.contextMenu) close();
			else schedule();
		}
		// Clicks inside an iframe (the canvas) never reach this document: close when focus moves there.
		function windowBlur() {
			setTimeout(() => {
				if (document.activeElement?.tagName === "IFRAME") close();
			});
		}
		function listen() {
			document.addEventListener("pointerdown", outsidePointer, true);
			document.addEventListener("scroll", viewportChange, true);
			window.addEventListener("resize", viewportChange);
			window.addEventListener("blur", windowBlur);
			if (typeof ResizeObserver !== "undefined") {
				observer = new ResizeObserver(schedule);
				observer.observe(menu.value);
			}
		}
		function unlisten() {
			document.removeEventListener("pointerdown", outsidePointer, true);
			document.removeEventListener("scroll", viewportChange, true);
			window.removeEventListener("resize", viewportChange);
			window.removeEventListener("blur", windowBlur);
			observer?.disconnect();
			observer = null;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		}
		async function show(at = null, focusLast = false) {
			if (props.disabled) return;
			point = at;
			if (open.value) {
				place();
				return;
			}
			open.value = true;
			await nextTick();
			const el = menu.value;
			if (!open.value || !el) return;
			// Top layer: above modal dialogs, never clipped by overflow or stacking contexts.
			try { el.showPopover?.(); } catch {}
			place();
			listen();
			// Long lists (icon pickers) open on the current choice.
			el.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
			const field = filterField();
			if (field && !focusLast) field.focus({ preventScroll: true });
			else {
				const items = buttons();
				(focusLast ? items.at(-1) : items[0])?.focus({ preventScroll: true });
			}
		}
		function close(restoreFocus = false) {
			if (open.value) {
				unlisten();
				open.value = false;
			}
			if (restoreFocus) trigger.value?.querySelector("button")?.focus();
		}
		function triggerClick(event) {
			if (props.contextMenu) {
				event.stopPropagation();
				close();
				return;
			}
			if (open.value) close();
			else show();
		}
		function contextMenuOpen(event) {
			if (!props.contextMenu) return;
			event.preventDefault();
			event.stopPropagation();
			if (props.disabled) return;
			emit('contextmenu', event);
			// Pointer: open at the cursor; keyboard (ContextMenu, Shift+F10): open under the row.
			if (event.type === 'contextmenu' && event.clientX) show({ x: event.clientX, y: event.clientY });
			else show();
		}
		// Opens the context menu at viewport coordinates, for callers without a DOM event (the canvas iframe).
		function openAt(x, y) {
			if (!props.contextMenu) return;
			return show({ x, y });
		}
		function triggerKeydown(event) {
			if (props.contextMenu) {
				if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) contextMenuOpen(event);
				return;
			}
			if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
			event.preventDefault();
			event.stopPropagation();
			if (event.key === "Escape") {
				close(true);
				return;
			}
			if (props.disabled) return;
			const focusLast = event.key === "ArrowUp";
			if (open.value) {
				const field = filterField();
				if (field && !focusLast) field.focus();
				else {
					const items = buttons();
					(focusLast ? items.at(-1) : items[0])?.focus();
				}
			} else show(null, focusLast);
		}
		function menuKeydown(event) {
			const field = filterField();
			if (field && event.target === field) {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					if (query.value) query.value = "";
					else close(true);
					return;
				}
				if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
				event.preventDefault();
				event.stopPropagation();
				const matches = buttons();
				if (!matches.length) return;
				(event.key === "ArrowDown" ? matches[0] : matches.at(-1))?.focus();
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				close(true);
				return;
			}
			if (event.key === "Tab") {
				close(true);
				return;
			}
			if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
			event.preventDefault();
			event.stopPropagation();
			const items = buttons();
			if (!items.length) return;
			const index = items.indexOf(document.activeElement);
			const next =
				event.key === "Home"
					? 0
					: event.key === "End"
						? items.length - 1
						: (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
							items.length;
			items[next]?.focus();
		}
		function focusOut(event) {
			if (
				event.relatedTarget &&
				!menu.value?.contains(event.relatedTarget) &&
				!trigger.value?.contains(event.relatedTarget)
			)
				close();
		}
		function select(item) {
			if (props.disabled || item.disabled) return;
			// Where the menu was, so an item can open a follow-up popover in the same place.
			const rect = menu.value?.getBoundingClientRect();
			const anchor = rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null;
			close(true);
			emit("select", item, anchor);
		}
		watch(open, (isOpen) => {
			if (!isOpen) query.value = "";
		});
		watch(
			() => props.disabled,
			(disabled) => {
				if (disabled) close();
			},
		);
		onBeforeUnmount(unlisten);
		return {
			root,
			trigger,
			menu,
			open,
			menuId,
			filterWrap,
			query,
			translate,
			visibleItems,
			triggerKeydown,
			triggerClick,
			contextMenuOpen,
			openAt,
			close,
			menuKeydown,
			focusOut,
			select,
		};
	},
});
</script>
