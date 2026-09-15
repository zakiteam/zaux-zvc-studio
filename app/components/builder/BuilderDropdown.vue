<template>
	<Popover
		ref="popover"
		:stayOpen="contextMenu"
		:position="align === 'end' ? 'bottom-right' : 'bottom-left'"
		customZIndex="z-[1000]"
		:attributes="{
			dropdown: { class: '!min-w-0 !w-max max-w-[calc(100vw-24px)]' },
		}"
		@open="opened"
		@closed="open = false"
	>
		<template #trigger>
			<div ref="trigger" @keydown="triggerKeydown" @keyup.stop @click="triggerClick" @contextmenu="contextMenuOpen">
				<slot name="trigger" :open="open" :menu-id="menuId">
				<BuilderButton
					:size="btnSize ?? 's'"
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
		</template>
		<template #content>
			<Teleport to="body" :disabled="!contextMenu">
			<div
				v-if="!contextMenu || open"
				:style="contextMenu ? contextStyle : null"
				:id="menuId"
				ref="menu"
				role="menu"
				:aria-label="label"
				:class="contentClass"
				class="zb-builder-dropdown-content mt-1 w-[280px] py-1 pb-2 max-w-[calc(100vw-24px)] overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white font-builder text-zaux-dark dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] shadow-deeper"
				@keydown="menuKeydown"
				@keyup.stop
				@focusout="focusOut"
			>
				<div
					v-if="$slots.header"
					role="presentation"
					class="px-2 py-2 mb-2 border-b-slim border-zaux-light-grey"
				>
					<slot name="header" />
				</div>
				<div class="max-h-[min(60dvh,420px)] overflow-y-auto px-2 flex flex-col gap-1">
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
						<BuilderButton
							role="menuitem"
							variant="alt1"
							tabindex="-1"
							:label="item.label"
							:swatch="item.swatch"
							:title="item.label"
							:icon="item.icon"
							:extraProps="{
								inheritedUIFlags : {
									'HOVER' : item.active
								}
							}"
							:disabled="disabled || item.disabled"
							:aria-current="item.active ? 'true' : undefined"
							class="!flex !w-full !justify-start !whitespace-normal"
							:class="[
								//item.active && 'pl-1 before:!h-full before:inline-block before:!w-2 before:!bg-zaux-accent',
								item.danger && '[&.zb-button]:!text-utility-error',
								item?.class
							]"
							@click="select(item)"
							:theme="btnTheme"
						/>
					</template>
				</div>
			</div>
			</Teleport>
		</template>
	</Popover>
</template>
<script>
import { defineComponent, ref, computed, nextTick, watch, useId, onMounted, onBeforeUnmount } from "vue";
import BuilderButton from "./BuilderButton.vue";
export default defineComponent({
	components: { BuilderButton },
	props: {
		btnTheme : { default : 'secondary' },
		label: { type: String, required: true },
		icon: { type: String, default: "dropdown-bottom" },
		iconOnly: Boolean,
		contextMenu: Boolean,
		contentClass: { type: String, default: "" },
		swatch: String,
		items: { type: Array, default: () => [] },
		disabled: Boolean,
		align: { default: "start" },
		extraTriggerProps : { default : null },
		btnSize : { default : 's' }
	},
	emits: ["select", "contextmenu"],
	setup(props, { emit }) {
		const popover = ref(null);
		const trigger = ref(null);
		const menu = ref(null);
		const open = ref(false);
		const contextStyle = ref({});
		const menuId = useId();
		let focusLast = false;
		const visibleItems = computed(() =>
			props.items.filter((item) => item.hidden !== true),
		);
		const buttons = () => [
			...(menu.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') ??
				[]),
		];
		function close(restoreFocus = false) {
			if (props.contextMenu) open.value = false;
			else popover.value?.forceCloseDropdown();
			if (restoreFocus) trigger.value?.querySelector("button")?.focus();
		}
		async function opened() {
			if (props.disabled) {
				close();
				return;
			}
			open.value = true;
			await nextTick();
			const items = buttons();
			(focusLast ? items.at(-1) : items[0])?.focus();
			focusLast = false;
		}
		function triggerClick(event) {
			if (props.contextMenu) { event.stopPropagation(); close(); }
		}
		async function contextMenuOpen(event) {
			if (!props.contextMenu) return;
			event.preventDefault();
			event.stopPropagation();
			if (props.disabled) return;
			emit('contextmenu', event);
			const rect = trigger.value.getBoundingClientRect();
			const x = event.type === 'contextmenu' && event.clientX ? event.clientX : rect.left;
			const y = event.type === 'contextmenu' && event.clientY ? event.clientY : rect.bottom;
			contextStyle.value = { position: 'fixed', zIndex: 1000, margin: 0, left: '0px', top: '0px', visibility: 'hidden' };
			open.value = true;
			await nextTick();
			if (!open.value || !menu.value) return;
			const bounds = menu.value.getBoundingClientRect();
			contextStyle.value = {
				position: 'fixed', zIndex: 1000, margin: 0,
				left: `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`,
				top: `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`,
			};
			await nextTick();
			if (open.value) buttons()[0]?.focus({ preventScroll: true });
		}
		function outsidePointer(event) {
			if (props.contextMenu && open.value && !trigger.value?.contains(event.target) && !menu.value?.contains(event.target)) close();
		}
		function contextScroll(event) {
			if (!menu.value?.contains(event.target)) close();
		}
		onMounted(() => {
			if (!props.contextMenu) return;
			document.addEventListener('pointerdown', outsidePointer);
			document.addEventListener('scroll', contextScroll, true);
			window.addEventListener('resize', contextScroll);
		});
		onBeforeUnmount(() => {
			document.removeEventListener('pointerdown', outsidePointer);
			document.removeEventListener('scroll', contextScroll, true);
			window.removeEventListener('resize', contextScroll);
		});
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
			focusLast = event.key === "ArrowUp";
			if (open.value) {
				const items = buttons();
				(focusLast ? items.at(-1) : items[0])?.focus();
			} else popover.value?.toggleDropDown();
		}
		function menuKeydown(event) {
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
			close(true);
			emit("select", item);
		}
		watch(
			() => props.disabled,
			(disabled) => {
				if (disabled) close();
			},
		);
		return {
			popover,
			trigger,
			menu,
			open,
			menuId,
			visibleItems,
			opened,
			triggerKeydown,
			triggerClick,
			contextMenuOpen,
			contextStyle,
			menuKeydown,
			focusOut,
			select,
		};
	},
});
</script>
