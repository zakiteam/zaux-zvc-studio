<template>
	<template v-if="active && activeDefinition">
		<div v-if="selectedNode && !isSource" ref="stylePanel">
			<nav
				ref="quickpad"
				:aria-label="translate('zx_builder_style_quickpad')"
				class="sticky top-0 z-10 -mx-2 mb-2 border-b-slim border-zaux-light-grey bg-zaux-white/90 px-2 pb-1 pt-1.5 backdrop-blur-sm"
				@mouseleave="hoveredShortcut = ''"
			>
				<!-- Segmented groups: setup, box layout, appearance, code. -->
				<div class="flex flex-wrap gap-1 w-full">
					<div v-for="group in shortcutGroups" :key="group.id" class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
						<button
							v-for="section in group.items"
							:key="section.id"
							type="button"
							:aria-label="translate(section.label)"
							:title="translate(section.label)"
							:aria-current="activeShortcut === section.id ? 'location' : undefined"
							:class="activeShortcut === section.id
								? 'bg-zaux-white text-zaux-accent shadow-sm'
								: 'text-zaux-dark-grey hover:bg-zaux-white/70 hover:text-zaux-dark'"
							class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-xxs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zaux-accent"
							@mouseenter="hoveredShortcut = section.id"
							@focus="hoveredShortcut = section.id"
							@blur="hoveredShortcut = ''"
							@click="goToSection(section.id)"
						>
							<!-- Masked so the icon follows the text color (theme, hover, active accent). -->
							<span aria-hidden="true" class="block h-[16px] w-[16px]" :style="quickpadIcon(section.id)" />
						</button>
					</div>
				</div>
				<p class="mt-1 flex h-[14px] min-w-0 items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-zaux-dark-grey" aria-hidden="true">
					<span class="h-[5px] w-[5px] shrink-0 rounded-full transition-colors"
						:class="captionShortcut && captionShortcut === activeShortcut ? 'bg-zaux-accent' : 'bg-zaux-light-grey'" />
					<span class="min-w-0 truncate">{{ captionLabel }}</span>
				</p>
			</nav>
			<p class="mb-2 text-[12px] font-semibold">{{ selectedNode.name }}</p>
			<div
				v-if="visibility.advanced"
				data-style-section="classes"
				tabindex="-1"
				class="zb-field [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"
			>
				<label>{{ translate("zx_builder_classes") }}</label>
				<BuilderStyleInput
					v-if="selectedNode.props.class == null || typeof selectedNode.props.class === 'string'"
					:key="selectedNode.id"
					:modelValue="selectedNode.props.class ?? ''"
					:label="translate('zx_builder_classes')"
					:disabled="!canEditRemote"
					@update:modelValue="setProperty('class', $event)"
				/>
				<BuilderValue v-else
					:modelValue="selectedNode.props.class ?? ''"
					label="CSS class"
					type="json"
					:disabled="!canEditRemote"
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
import { nodeStyleSections } from "../../../../integrations/zaux/controls/node-style-controls.js";
import { imageStyleTarget } from "../../../../integrations/zaux/controls/image-style-controls.js";
import BuilderValue from "../fields/BuilderValue.vue";
import BuilderStyleInput from "../fields/BuilderStyleInput.vue";
import BuilderNodeStyles from "../fields/styles/BuilderNodeStyles.vue";
export default defineComponent({
	components: { BuilderValue, BuilderStyleInput, BuilderNodeStyles },
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
		const hoveredShortcut = ref("");
		// A shortcut scroll owns the active item until it ends; scroll-spy then follows the user.
		let programmaticScroll = false;
		let programmaticTimer = null;
		let spyFrame = null;
		function releaseProgrammatic() {
			clearTimeout(programmaticTimer);
			programmaticScroll = false;
		}
		// Active section: the last one whose top has passed under the sticky quickpad.
		function spySection(scroller) {
			const panel = stylePanel.value;
			if (!panel || !quickpad.value) return;
			const line = quickpad.value.getBoundingClientRect().bottom + 12;
			const sections = shortcuts.value
				.map(item => ({ id: item.id, element: panel.querySelector(`[data-style-section="${item.id}"]`) }))
				.filter(item => item.element);
			if (!sections.length) return;
			let current = sections[0].id;
			for (const item of sections) if (item.element.getBoundingClientRect().top <= line) current = item.id;
			// At the bottom the last sections cannot reach the line: keep a visible choice.
			if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
				const visible = sections.filter(item => item.element.getBoundingClientRect().top < scroller.getBoundingClientRect().bottom);
				if (!visible.some(item => item.id === activeShortcut.value)) current = visible.at(-1)?.id ?? current;
				else current = activeShortcut.value;
			}
			activeShortcut.value = current;
		}
		watch(stylePanel, (panel, _previous, onCleanup) => {
			activeShortcut.value = "";
			const scroller = panel?.closest("[data-inspector-scroll]");
			if (!scroller) return;
			const onScroll = () => {
				if (programmaticScroll || spyFrame !== null) return;
				spyFrame = requestAnimationFrame(() => { spyFrame = null; spySection(scroller); });
			};
			scroller.addEventListener("scroll", onScroll, { passive: true });
			scroller.addEventListener("scrollend", releaseProgrammatic);
			nextTick(() => spySection(scroller));
			onCleanup(() => {
				clearFlare();
				releaseProgrammatic();
				if (spyFrame !== null) cancelAnimationFrame(spyFrame);
				spyFrame = null;
				scroller.removeEventListener("scroll", onScroll);
				scroller.removeEventListener("scrollend", releaseProgrammatic);
			});
		});
		watch(() => builder.selectedNode.value?.id, async () => {
			clearFlare();
			releaseProgrammatic();
			await nextTick();
			const scroller = stylePanel.value?.closest("[data-inspector-scroll]");
			if (scroller) spySection(scroller);
			else activeShortcut.value = "";
		});
		const shortcuts = computed(() => [
			...(visibility.value.advanced ? [{ id: "classes", label: "zx_builder_classes" }] : []),
			{ id: "breakpoint", label: "zx_builder_style_breakpoint" },
			...(visibility.value.image && imageStyleTarget(builder.selectedNode.value?.name)
				? [{ id: "image", label: "zx_builder_style_image" }] : []),
			...visibleStyleSections(nodeStyleSections, visibility.value).map(({ id }) => ({ id, label: `zx_builder_style_${id}` })),
			...(visibility.value.advanced ? [{ id: "inline", label: "zx_builder_style_inline" }] : []),
		]);
		const shortcutGroupOf = {
			classes: "setup", breakpoint: "setup", image: "setup",
			layout: "box", placement: "box", dimensions: "box", positioning: "box", margin: "box", padding: "box",
			inline: "code",
		};
		const shortcutGroups = computed(() => shortcuts.value.reduce((groups, item) => {
			const id = shortcutGroupOf[item.id] ?? "appearance";
			const group = groups.find(entry => entry.id === id);
			if (group) group.items.push(item);
			else groups.push({ id, items: [item] });
			return groups;
		}, []));
		// Zaux's Tailwind palette replaces the default colors, so there is no bg-current: paint inline.
		function quickpadIcon(id) {
			const image = `url("/assets/builder/quickpad-${id}.svg")`;
			return {
				backgroundColor: "currentColor",
				maskImage: image, WebkitMaskImage: image,
				maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
				maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
				maskPosition: "center", WebkitMaskPosition: "center",
			};
		}
		// The caption previews the hovered/focused shortcut, otherwise names the current section.
		const captionShortcut = computed(() => hoveredShortcut.value || activeShortcut.value);
		const captionLabel = computed(() => {
			const item = shortcuts.value.find(entry => entry.id === captionShortcut.value);
			return builder.translate(item?.label ?? "zx_builder_style_quickpad");
		});
		watch(shortcuts, items => {
			if (!items.some(item => item.id === activeShortcut.value)) activeShortcut.value = "";
			if (!items.some(item => item.id === hoveredShortcut.value)) hoveredShortcut.value = "";
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
			// Keep the clicked item active during the smooth scroll; the timeout covers
			// browsers without scrollend and scrolls that do not move.
			programmaticScroll = true;
			clearTimeout(programmaticTimer);
			programmaticTimer = setTimeout(releaseProgrammatic, reducedMotion ? 50 : 900);
			scroller.scrollTo({
				top: Math.max(0, top),
				behavior: reducedMotion ? "instant" : "smooth",
			});
		}
		function setProperty(key, value) {
			builder.updateNode({ ...builder.selectedNode.value.props, [key]: value });
		}
		return { ...builder, styleScope, visibility, chosenViewports, stylePanel, quickpad, activeShortcut, hoveredShortcut, shortcuts, shortcutGroups, captionShortcut, captionLabel, quickpadIcon, goToSection, setProperty };
	},
});
</script>
