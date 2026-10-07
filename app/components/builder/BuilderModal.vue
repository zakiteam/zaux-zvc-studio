<template>
	<dialog
		ref="dialog"
		:aria-labelledby="titleId"
		class="zb-modal max-w-[calc(100vw-32px)] overflow-hidden rounded-xs border-none bg-zaux-white p-0 font-builder text-[12px] text-zaux-dark shadow-deeper backdrop:bg-zaux-black/40 backdrop:backdrop-blur-[4px] open:flex open:flex-col"
		:class="[SIZES[size] ?? SIZES.md, HEIGHTS[height] ?? HEIGHTS.auto]"
		@keydown.stop
		@cancel="onCancel"
		@close="onClose"
		@mousedown="backdropDown"
		@click="backdropClick"
	>
		<header class="flex h-[52px] shrink-0 items-center gap-1.5 border-b-slim border-zaux-light-grey px-2">
			<div class="min-w-0">
				<h2 :id="titleId" class="truncate text-[15px] font-semibold leading-tight">{{ title }}</h2>
				<p v-if="subtitle" class="truncate text-[10px] uppercase leading-tight tracking-wider text-zaux-dark-grey">{{ subtitle }}</p>
			</div>
			<span v-if="hint" class="grid h-[24px] w-[20px] shrink-0 cursor-help place-items-center text-zaux-dark-grey" role="img" :title="hint" :aria-label="hint">
				<Icon iconName="info" size="text-icon-xxs" aria-hidden="true" />
			</span>
			<slot name="header" :close="close" />
			<BuilderButton class="ml-auto" icon="close" iconOnly size="xs" variant="alt1" :disabled="busy" :label="translate('zx_builder_close')" @click="close" />
		</header>
		<div class="zb-modal-body zb-scroll min-h-0 flex-1 overflow-auto" :class="bodyClass">
			<slot :close="close" />
		</div>
		<footer v-if="$slots.footer" class="flex shrink-0 flex-wrap items-center justify-end gap-1 border-t-slim border-zaux-light-grey px-1 py-1">
			<slot name="footer" :close="close" />
		</footer>
	</dialog>
</template>
<script>
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useTranslation } from "../../composables/useTranslation.js";
import BuilderButton from "./BuilderButton.vue";

const SIZES = {
	sm: "w-[440px]",
	md: "w-[680px]",
	lg: "w-[1040px]",
	xl: "w-[1240px]",
	full: "w-[1400px]",
};
const HEIGHTS = {
	auto: "max-h-[90dvh]",
	fill: "h-[min(800px,90dvh)]",
	screen: "h-[90dvh]",
};
const FIELDS = '[autofocus], input:not([type="file"]):not([type="hidden"]):not([type="checkbox"]):not([readonly]):not(:disabled), textarea:not([readonly]):not(:disabled), select:not(:disabled)';

// Shared native modal: header (title, hint, extra controls, close), scrolling body and optional footer.
// Consumers only provide the slot content; Escape, focus trapping and the top layer come from <dialog>.
export default defineComponent({
	name: "BuilderModal",
	components: { BuilderButton },
	props: {
		title: { type: String, required: true },
		subtitle: String,
		hint: String,
		size: { type: String, default: "md" },
		height: { type: String, default: "auto" },
		bodyClass: { default: "p-2" },
		// Busy modals cannot be dismissed (close button, Escape, backdrop).
		busy: Boolean,
		// Mounting opens by default; pass :open for a modal that stays mounted.
		open: { type: Boolean, default: true },
		closeOnBackdrop: Boolean,
		// Selector to focus on open, or false to leave focus to the content.
		initialFocus: { type: [String, Boolean], default: null },
		// Selector focused on close when the opener no longer exists.
		fallbackFocus: String,
	},
	emits: ["close"],
	setup(props, { emit }) {
		const { translate } = useTranslation();
		const dialog = ref(null);
		let previousFocus = null;
		let silent = false;
		let pressedBackdrop = false;
		let disposed = false;
		function restoreFocus() {
			const target = previousFocus?.isConnected ? previousFocus : props.fallbackFocus ? document.querySelector(props.fallbackFocus) : null;
			previousFocus = null;
			target?.focus();
		}
		async function show() {
			if (!dialog.value || dialog.value.open) return;
			previousFocus = document.activeElement;
			dialog.value.showModal();
			if (props.initialFocus === false) return;
			await nextTick();
			const root = dialog.value;
			const target = (typeof props.initialFocus === "string" && root?.querySelector(props.initialFocus))
				|| root?.querySelector(".zb-modal-body")?.querySelector(FIELDS);
			target?.focus();
		}
		function hide() {
			if (!dialog.value?.open) return;
			silent = true;
			dialog.value.close();
		}
		function close() {
			if (!props.busy) dialog.value?.close();
		}
		function onCancel(event) {
			if (props.busy) event.preventDefault();
		}
		function onClose() {
			// The native close event is queued, so it can arrive after unmount.
			if (disposed) return;
			restoreFocus();
			if (silent) { silent = false; return; }
			emit("close");
		}
		// Only a press and release both on the backdrop dismiss, so text selection can end outside.
		function onBackdrop(event) {
			if (event.target !== dialog.value) return false;
			const rect = dialog.value.getBoundingClientRect();
			return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
		}
		function backdropDown(event) { pressedBackdrop = props.closeOnBackdrop && onBackdrop(event); }
		function backdropClick(event) {
			if (pressedBackdrop && onBackdrop(event)) close();
			pressedBackdrop = false;
		}
		watch(() => props.open, (value) => (value ? show() : hide()));
		onMounted(() => { if (props.open) show(); });
		onBeforeUnmount(() => {
			disposed = true;
			if (!dialog.value?.open) return;
			dialog.value.close();
			restoreFocus();
		});
		return { SIZES, HEIGHTS, titleId: useId(), dialog, translate, close, onCancel, onClose, backdropDown, backdropClick };
	},
});
</script>
