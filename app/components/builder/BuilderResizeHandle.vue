<template>
	<button
		class="relative z-10 p-0 bg-transparent border-0 dark:bg-zaux-light-grey/20 dark:hover:bg-zaux-accent/20 zb-resize-handle group shrink-0 hover:bg-zaux-accent/20 focus-visible:bg-zaux-accent/20"
		:class="
			direction === 'vertical'
				? 'h-1 w-full cursor-row-resize'
				: 'w-1 cursor-col-resize'
		"
		type="button"
		:aria-label="label"
		@pointerdown="start"
	>
		<span
			class="absolute transition-opacity -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 pointer-events-none left-1/2 top-1/2 bg-zaux-light-grey group-hover:opacity-100 group-focus-visible:opacity-100"
			:class="direction === 'vertical' ? 'h-0.5 w-10' : 'h-10 w-0.5'"
		></span>
	</button>
</template>
<script>
import { defineComponent, onBeforeUnmount } from "vue";
export default defineComponent({
	props: {
		side: { default: "left" },
		direction: { default: "horizontal" },
		label: { default: "Ridimensiona pannello" },
	},
	emits: ["resize"],
	setup(props, { emit }) {
		let previous = 0;
		function value(event) {
			return props.direction === "vertical" ? event.clientY : event.clientX;
		}
		function move(event) {
			const delta = value(event) - previous;
			previous = value(event);
			const flip =
				(props.direction === "horizontal" && props.side === "right") ||
				(props.direction === "vertical" && props.side === "bottom");
			emit("resize", flip ? -delta : delta);
		}
		function stop() {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			document.body.classList.remove("zb-resizing");
		}
		function start(event) {
			previous = value(event);
			document.body.classList.add("zb-resizing");
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", stop, { once: true });
			event.preventDefault();
		}
		onBeforeUnmount(stop);
		return { start };
	},
});
</script>
