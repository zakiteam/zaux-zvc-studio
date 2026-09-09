<template>
	<Popover
		ref="popover"
		:position="align === 'end' ? 'bottom-right' : 'bottom-left'"
		customZIndex="z-[1000]"
		:attributes="{
			dropdown: { class: '!min-w-0 !w-max max-w-[calc(100vw-24px)]' },
		}"
		@open="opened"
		@closed="open = false"
	>
		<template #trigger>
			<div ref="trigger" @keydown="triggerKeydown" @keyup.stop>
				<BuilderButton
					:theme="btnTheme ?? 'primary'"
					:label="label"
					:title="label"
					:icon="icon"
					:iconOnly="iconOnly"
					:disabled="disabled"
					:aria-expanded="open"
					aria-haspopup="menu"
					:aria-controls="menuId"
					class="!max-w-[220px] max-[600px]:!max-w-[145px] [&_*]:truncate"
				/>
			</div>
		</template>
		<template #content>
			<div
				:id="menuId"
				ref="menu"
				role="menu"
				:aria-label="label"
				class="mt-1 w-[280px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white font-builder text-zaux-dark shadow-deeper"
				@keydown="menuKeydown"
				@keyup.stop
				@focusout="focusOut"
			>
				<div
					v-if="$slots.header"
					role="presentation"
					class="border-b-slim border-zaux-light-grey px-2.5 py-2"
				>
					<slot name="header" />
				</div>
				<div class="max-h-[min(60dvh,420px)] overflow-y-auto p-1">
					<template v-for="item in visibleItems" :key="item.id">
						<div
							v-if="item.separator"
							role="separator"
							class="my-1 border-t-slim border-zaux-light-grey"
						/>
						<p
							v-if="item.heading"
							role="presentation"
							class="px-1.5 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-wider text-zaux-dark-grey"
						>
							{{ item.heading }}
						</p>
						<BuilderButton
							role="menuitem"
							tabindex="-1"
							:label="item.label"
							:title="item.label"
							:icon="item.icon"
							:disabled="disabled || item.disabled"
							:aria-current="item.active ? 'true' : undefined"
							class="!flex !w-full !justify-start !whitespace-normal !text-left [&_*]:!text-left hover:!bg-zaux-light focus:!bg-zaux-light"
							:class="{
								'[&.zb-button]:!bg-zaux-accent/10 [&.zb-button]:!text-zaux-accent':
									item.active,
								'[&.zb-button]:!text-utility-error': item.danger,
							}"
							@click="select(item)"
              :theme="btnTheme"
						/>
					</template>
				</div>
			</div>
		</template>
	</Popover>
</template>
<script>
import { defineComponent, ref, computed, nextTick, watch, useId } from "vue";
import BuilderButton from "./BuilderButton.vue";
export default defineComponent({
	components: { BuilderButton },
	props: {
    btnTheme : { default : 'secondary' },
    label: { type: String, required: true },
		icon: { type: String, default: "dropdown-bottom" },
		iconOnly: Boolean,
		items: { type: Array, default: () => [] },
		disabled: Boolean,
		align: { default: "start" },
	},
	emits: ["select"],
	setup(props, { emit }) {
		const popover = ref(null);
		const trigger = ref(null);
		const menu = ref(null);
		const open = ref(false);
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
			popover.value?.forceCloseDropdown();
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
		function triggerKeydown(event) {
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
			menuKeydown,
			focusOut,
			select,
		};
	},
});
</script>
