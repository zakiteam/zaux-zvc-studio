<template>
	<template v-if="active && activeDefinition">
		<div v-if="selectedNode && !isSource" ref="stylePanel">
			<nav
				ref="quickpad"
				:aria-label="translate('zx_builder_style_quickpad')"
				class="sticky top-0 z-10 -mx-2 mb-2 flex flex-wrap gap-1 border-b-slim border-zaux-light-grey bg-zaux-white px-2 py-1.5"
			>
				<button
					v-for="section in shortcuts"
					:key="section.id"
					type="button"
					:aria-label="translate(section.label)"
					:title="translate(section.label)"
					:aria-current="activeShortcut === section.id ? 'location' : undefined"
					:class="activeShortcut === section.id ? 'border-zaux-accent bg-zaux-accent/15' : 'border-transparent hover:border-zaux-light-grey hover:bg-zaux-light'"
					class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-xxs border-slim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaux-accent"
					@click="goToSection(section.id)"
				>
					<img :src="`/assets/builder/quickpad-${section.id}.svg`" width="20" height="20" alt="" draggable="false" class="dark:invert" />
				</button>
			</nav>
			<p class="mb-2 text-[12px] font-semibold">{{ selectedNode.name }}</p>
			<div
				v-if="visibility.advanced"
				data-style-section="classes"
				tabindex="-1"
				class="zb-field [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_classes") }}</label
				><BuilderValue
					:modelValue="selectedNode.props.class ?? ''"
					label="CSS class"
					:type="
						Array.isArray(selectedNode.props.class) ? 'json' : 'text'
					"
					@update:modelValue="setProperty('class', $event)"
				/>
			</div>
			<BuilderNodeStyles
				:preferredScope="followViewportStyles ? viewportStyleScope : null"
				@update:scope="styleScope = $event"
				:nodeName="selectedNode.name"
				:nodeId="selectedNode.id"
				:viewportChosen="chosenViewports.has(selectedNode.id)"
				@viewport-chosen="chosenViewports.add(selectedNode.id)"
				@update:viewportStyles="updateNode({ ...selectedNode.props, ...$event })"
				:imgClasses="selectedNode.props.imgClasses"
				@update:imgClasses="setProperty('imgClasses', $event)"
				:modelValue="selectedNode.props.class"
				:disabled="!canEditRemote"
				@update:modelValue="setProperty('class', $event)"
			/>
			<details v-if="visibility.advanced" data-style-section="inline">
				<summary>{{ translate("zx_builder_styles") }}</summary>
				<BuilderValue
					:modelValue="selectedNode.props.style ?? {}"
					label="CSS style"
					type="json"
					@update:modelValue="setProperty('style', $event)"
				/>
			</details>
		</div>
		<p v-else-if="!isSource" class="py-4 text-center text-[12px] text-zaux-dark-grey">
			{{ translate('zx_builder_select_hint') }}
		</p>
	</template>
</template>
<script>
import { computed, defineComponent, nextTick, ref, watch } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { styleVisibility, visibleStyleSections } from "../../../../integrations/zaux/style-visibility.js";
import { nodeStyleSections } from "../../../../integrations/zaux/node-style-controls.js";
import { imageStyleTarget } from "../../../../integrations/zaux/image-style-controls.js";
import BuilderValue from "../fields/BuilderValue.vue";
import BuilderNodeStyles from "../fields/styles/BuilderNodeStyles.vue";
export default defineComponent({
	components: { BuilderValue, BuilderNodeStyles },
	props: { active: Boolean },
	setup() {
		const builder = useBuilder();
		const stylePanel = ref(null);
		const quickpad = ref(null);
		const chosenViewports = ref(new Set());
		const styleScope = ref("");
		const visibility = computed(() => styleVisibility(styleScope.value));
		const activeShortcut = ref("");
		let sectionFlare = null;
		function clearFlare() {
			sectionFlare?.cancel();
			sectionFlare = null;
		}
		function flareSection(section, reducedMotion) {
			clearFlare();
			const glow = {
				backgroundColor: "rgb(var(--zx-color-zaux-accent) / 0.08)",
			};
			sectionFlare = section.animate(
				reducedMotion ? [glow, glow] : [
					{ ...glow, offset: 0 },
					{ ...glow, offset: 0.45 },
					{ backgroundColor: "transparent", boxShadow: "inset 3px 0 0 transparent", offset: 1 },
				],
				{ duration: reducedMotion ? 1100 : 1800, easing: "ease-out" },
			);
		}
		watch(stylePanel, (panel, _previous, onCleanup) => {
			activeShortcut.value = "";
			const scroller = panel?.closest("[data-inspector-scroll]");
			if (!scroller) return;
			const clear = () => { activeShortcut.value = ""; };
			const onKeydown = event => {
				if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
				if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) clear();
			};
			const onPointerdown = event => {
				// Scrollbar dragging targets the scroll container itself.
				if (event.target === scroller) clear();
			};
			// User intent clears the shortcut; our smooth scroll must not clear it.
			scroller.addEventListener("wheel", clear, { passive: true });
			scroller.addEventListener("touchmove", clear, { passive: true });
			scroller.addEventListener("keydown", onKeydown);
			scroller.addEventListener("pointerdown", onPointerdown);
			onCleanup(() => {
				clearFlare();
				scroller.removeEventListener("wheel", clear);
				scroller.removeEventListener("touchmove", clear);
				scroller.removeEventListener("keydown", onKeydown);
				scroller.removeEventListener("pointerdown", onPointerdown);
			});
		});
		watch(() => builder.selectedNode.value?.id, () => { activeShortcut.value = ""; clearFlare(); });
		const shortcuts = computed(() => [
			...(visibility.value.advanced ? [{ id: "classes", label: "zx_builder_classes" }] : []),
			{ id: "breakpoint", label: "zx_builder_style_breakpoint" },
			...(visibility.value.image && imageStyleTarget(builder.selectedNode.value?.name)
				? [{ id: "image", label: "zx_builder_style_image" }] : []),
			...visibleStyleSections(nodeStyleSections, visibility.value).map(({ id }) => ({ id, label: `zx_builder_style_${id}` })),
			...(visibility.value.advanced ? [{ id: "inline", label: "zx_builder_style_inline" }] : []),
		]);
		watch(shortcuts, items => {
			if (!items.some(item => item.id === activeShortcut.value)) activeShortcut.value = "";
		});
		async function goToSection(id) {
			const panel = stylePanel.value;
			const scroller = panel?.closest("[data-inspector-scroll]");
			const section = panel?.querySelector(`[data-style-section="${id}"]`);
			if (!scroller || !section || !quickpad.value) return;
			activeShortcut.value = id;
			if (section.tagName === "DETAILS") section.open = true;
			await nextTick();
			if (!section.isConnected || !quickpad.value) return;
			const target = section.querySelector("summary") ?? section;
			// Focus the destination without letting the browser scroll other ancestors.
			target.focus({ preventScroll: true });
			const top = section.getBoundingClientRect().top
				- scroller.getBoundingClientRect().top - scroller.clientTop
				+ scroller.scrollTop - quickpad.value.getBoundingClientRect().height - 8;
			const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			flareSection(section, reducedMotion);
			scroller.scrollTo({
				top: Math.max(0, top),
				behavior: reducedMotion ? "instant" : "smooth",
			});
		}
		function setProperty(key, value) {
			builder.updateNode({ ...builder.selectedNode.value.props, [key]: value });
		}
		return { ...builder, styleScope, visibility, chosenViewports, stylePanel, quickpad, activeShortcut, shortcuts, goToSection, setProperty };
	},
});
</script>
