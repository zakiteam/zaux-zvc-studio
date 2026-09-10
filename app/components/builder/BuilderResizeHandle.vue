<template>
	<button
		class="zb-resize-handle group relative z-10 w-1 shrink-0 cursor-col-resize border-0 bg-transparent p-0 hover:bg-zaux-accent/20 focus-visible:bg-zaux-accent/20"
		type="button"
		:aria-label="label"
		@pointerdown="start"
	>
		<span
			class="pointer-events-none absolute left-1/2 top-1/2 h-10 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zaux-light-grey opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
		></span>
	</button>
</template>
<script>
import { defineComponent, onBeforeUnmount } from "vue";
export default defineComponent({
	props: {
		side: { default: "left" },
		label: { default: "Ridimensiona pannello" },
	},
	emits: ["resize"],
	setup(props, { emit }) {
		let previousX = 0;
		function move(event) {
			const delta = event.clientX - previousX;
			previousX = event.clientX;
			emit("resize", props.side === "right" ? -delta : delta);
		}
		function stop() {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			document.body.classList.remove("zb-resizing");
		}
		function start(event) {
			previousX = event.clientX;
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
