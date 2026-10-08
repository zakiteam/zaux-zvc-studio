<template>
	<BuilderModal
		:title="translate('zx_builder_cmd_palette')"
		:hint="translate('zx_builder_cmd_shortcuts')"
		size="lg"
		bodyClass="flex flex-col p-0"
		class="!mb-auto !mt-[10vh]"
		closeOnBackdrop
		@close="close"
	>
		<div class="shrink-0 border-b-slim border-zaux-light-grey px-2 py-1.5">
			<input
				v-model="query"
				type="search"
				role="combobox"
				aria-expanded="true"
				aria-autocomplete="list"
				autocomplete="off"
				:aria-controls="listId"
				:aria-activedescendant="results[activeIndex] ? optionId(results[activeIndex]) : undefined"
				:aria-label="translate('zx_builder_cmd_search')"
				:placeholder="translate('zx_builder_cmd_search')"
				class="w-full !py-1 px-1 !text-[13px]"
				@keydown="onKeydown"
			/>
		</div>
		<div class="flex min-h-0 flex-1">
		<ul
			v-if="results.length"
			ref="list"
			:id="listId"
			role="listbox"
			:aria-label="translate('zx_builder_cmd_palette')"
			class="zb-scroll m-0 h-[min(440px,55dvh)] min-w-0 flex-1 list-none overflow-auto p-1"
		>
			<li
				v-for="(item, index) in results"
				:key="item.id"
				:id="optionId(item)"
				:data-zb-thumb="hasPreview(item) ? item.id : undefined"
				role="option"
				:aria-selected="index === activeIndex"
				class="group flex cursor-pointer items-center gap-1 rounded-xxs py-0.5 pl-1 pr-1.5"
				:class="index === activeIndex ? 'bg-zaux-light' : ''"
				@mousemove="activeIndex = index"
				@click="insertItem(item)"
			>
				<span
					class="w-[30px] shrink-0 rounded-xxs py-0.25 text-center text-[9px] font-semibold"
					:class="kindClass(item)"
				>{{ kindLabel(item) }}</span>
				<!-- Inline thumbnail: the cached Library capture (Zaux components included), requested lazily while the row is in view. -->
				<span class="grid h-[36px] w-[48px] shrink-0 place-items-center overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white" aria-hidden="true">
					<img v-if="thumbnailOf(item)" :src="thumbnailOf(item)" alt="" loading="lazy" class="h-full w-full" :class="item.previewImage ? 'object-cover' : 'object-contain object-top'" />
					<span v-else-if="item.kind === 'element'" class="text-[16px] text-zaux-accent">{{ containers.includes(item.name) ? "▤" : "◇" }}</span>
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[12px] font-semibold">{{ item.name }}</span>
					<span class="block truncate text-[10px] text-zaux-dark-grey">
						<template v-if="item.kind === 'element'">{{ translate(item.group) }}</template>
						<template v-else>
							<span class="font-mono">{{ item.exportName }}</span>
							· {{ translate(item.id === 'source:' + item.sourceKey ? 'zx_builder_library_imported' : 'zx_builder_library_project') }}
							<template v-if="mode === 'library' && item.id === libraryId"> · {{ translate('zx_builder_cmd_current') }}</template>
						</template>
					</span>
				</span>
				<BuilderButton
					v-if="item.kind !== 'element'"
					size="xs"
					variant="alt1"
					icon="enter"
					tabindex="-1"
					:extraProps="{ actionIcon: false }"
					:label="translate('zx_builder_cmd_open')"
					class="shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
					:class="{ '!opacity-100': index === activeIndex }"
					@click.stop="openItem(item)"
				/>
				<BuilderButton
					size="xs"
					variant="alt1"
					icon="plus"
					tabindex="-1"
					:extraProps="{ actionIcon: false }"
					:label="translate('zx_builder_cmd_insert')"
					:title="insertTitle(item)"
					:disabled="!canInsert(item)"
					class="shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
					:class="{ '!opacity-100': index === activeIndex }"
					@click.stop="insertItem(item)"
				/>
			</li>
		</ul>
		<p v-else class="h-[min(440px,55dvh)] flex-1 px-2 py-4 text-center text-zaux-dark-grey" role="status">{{ translate('zx_builder_cmd_empty') }}</p>
		<!-- Preview of the active result: the same cached thumbnail shown by the Library cards. -->
		<aside
			v-if="activeItem"
			class="zb-scroll flex w-[380px] shrink-0 flex-col gap-1 overflow-auto border-l-slim border-zaux-light-grey bg-zaux-light/40 p-1.5 max-[860px]:hidden"
			:aria-label="translate('zx_builder_cmd_preview')"
		>
			<div class="relative grid aspect-[4/3] w-full shrink-0 place-items-center overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white">
				<span v-if="!hasPreview(activeItem)" class="text-[48px] text-zaux-accent" aria-hidden="true">{{ containers.includes(activeItem.name) ? "▤" : "◇" }}</span>
				<img v-else-if="previewImage" :src="previewImage" alt="" class="h-full w-full" :class="activeItem.previewImage ? 'object-cover' : 'object-contain object-top'" />
				<span v-else class="px-2 text-center text-[11px] text-zaux-dark-grey" :title="previewEntry?.error">
					{{ translate(previewEntry?.status === 'error' ? 'zx_builder_thumbnail_error' : 'zx_builder_thumbnail_loading') }}
				</span>
			</div>
			<div class="min-w-0">
				<p class="truncate text-[13px] font-semibold" :title="activeItem.name">{{ activeItem.name }}</p>
				<template v-if="activeItem.kind === 'element'">
					<p class="text-[10px] text-zaux-dark-grey">{{ translate(activeItem.group) }}</p>
				</template>
				<template v-else>
					<p class="truncate font-mono text-[10px] text-zaux-dark-grey">{{ activeItem.exportName }}</p>
					<p class="text-[10px] text-zaux-dark-grey">
						{{ kindLabel(activeItem) }} · {{ translate(activeItem.id === 'source:' + activeItem.sourceKey ? 'zx_builder_library_imported' : 'zx_builder_library_project') }}
						<template v-if="activeItem.fields?.length"> · {{ activeItem.fields.length }} {{ translate('zx_builder_fields').toLowerCase() }}</template>
					</p>
				</template>
			</div>
			<div class="mt-auto flex flex-wrap gap-1">
				<BuilderButton v-if="hasPreview(activeItem) && !activeItem.previewImage && previewEntry?.status === 'error'" size="xs" icon="refresh" tabindex="-1" :extraProps="{ actionIcon: false }"
					:label="translate('zx_builder_thumbnail_refresh')" @click="refreshPreview(activeItem)" />
				<BuilderButton v-if="activeItem.kind !== 'element'" size="xs" icon="enter" tabindex="-1" :extraProps="{ actionIcon: false }" :label="translate('zx_builder_cmd_open')" @click="openItem(activeItem)" />
				<BuilderButton size="xs" variant="primary" icon="plus" tabindex="-1" :extraProps="{ actionIcon: false }"
					:label="translate('zx_builder_cmd_insert')" :title="insertTitle(activeItem)" :disabled="!canInsert(activeItem)" @click="insertItem(activeItem)" />
			</div>
		</aside>
		</div>
		<template #footer>
			<span class="mr-auto text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_cmd_keys') }}</span>
			<span class="max-w-[50%] truncate text-[10px] text-zaux-dark-grey" :title="insertTarget">{{ translate('zx_builder_cmd_target', { target: insertTarget }) }}</span>
		</template>
	</BuilderModal>
</template>
<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { catalog, containers } from "../../services/catalog.js";

const LIMIT = 100;

// Palette elements can only be inserted; library definitions can also be opened for editing.
const ELEMENTS = catalog.map((entry) => ({ id: "element:" + entry.name, kind: "element", name: entry.name, group: entry.group, html: Boolean(entry.html) }));
// Library definitions and Zaux components have a rendered capture; HTML elements keep their glyph.
const hasPreview = (item) => !(item.kind === "element" && item.html);

// 3: prefix, 2: substring, 1: characters in order (fuzzy, as in a quick-open), 0: no match.
function matchScore(text, query) {
	const value = String(text ?? "").toLowerCase();
	if (!query) return 1;
	if (value.startsWith(query)) return 3;
	if (value.includes(query)) return 2;
	let index = 0;
	for (const char of value) {
		if (char === query[index]) index++;
		if (index === query.length) return 1;
	}
	return 0;
}

// Quick-open for ZVC/ZVP definitions and palette elements: Enter inserts into the current context, Shift+Enter edits a definition.
export default defineComponent({
	setup() {
		const builder = useBuilder();
		const query = ref("");
		const activeIndex = ref(0);
		const list = ref(null);
		const listId = useId();
		const optionId = (item) => `${listId}-${item.id.replace(/[^\w-]/g, "_")}`;
		const results = computed(() => {
			const needle = query.value.trim().toLowerCase();
			return [...builder.document.value.library, ...ELEMENTS]
				.map((item) => ({ item, score: Math.max(matchScore(item.name, needle), matchScore(item.exportName, needle), matchScore(item.sourceKey, needle)) }))
				.filter((entry) => entry.score > 0)
				// At equal score, library definitions come before palette elements.
				.sort((a, b) => b.score - a.score
					|| (a.item.kind === "element") - (b.item.kind === "element")
					|| a.item.name.localeCompare(b.item.name, builder.language.value, { sensitivity: "base" }))
				.slice(0, LIMIT)
				.map((entry) => entry.item);
		});
		watch(query, () => { activeIndex.value = 0; });
		const activeItem = computed(() => results.value[activeIndex.value] ?? null);
		const previewEntry = computed(() => (activeItem.value ? builder.libraryThumbnails.value[activeItem.value.id] : null));
		const previewImage = computed(() => activeItem.value?.previewImage || previewEntry.value?.url || "");
		const thumbnailOf = (item) => item.previewImage || builder.libraryThumbnails.value[item.id]?.url || "";
		// Render a missing thumbnail only once the selection rests, so arrowing through results stays cheap.
		let previewTimer;
		watch(activeItem, (item) => {
			clearTimeout(previewTimer);
			if (item && hasPreview(item) && !item.previewImage) previewTimer = setTimeout(() => builder.ensureLibraryThumbnail(item.id), 250);
		}, { immediate: true });
		// Inline thumbnails: request captures only for rows that stay in view for a moment.
		const rowTimers = new Map();
		let observer;
		function clearRowTimers() {
			for (const timer of rowTimers.values()) clearTimeout(timer);
			rowTimers.clear();
		}
		function observeRows() {
			observer?.disconnect();
			clearRowTimers();
			if (!list.value) return;
			observer = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					const id = entry.target.dataset.zbThumb;
					clearTimeout(rowTimers.get(id));
					rowTimers.delete(id);
					if (entry.isIntersecting) rowTimers.set(id, setTimeout(() => { rowTimers.delete(id); builder.ensureLibraryThumbnail(id); }, 400));
				}
			}, { root: list.value, rootMargin: "60px" });
			for (const row of list.value.querySelectorAll("[data-zb-thumb]")) {
				const id = row.dataset.zbThumb;
				const definition = builder.document.value.library.find((item) => item.id === id);
				if (definition ? !definition.previewImage : id.startsWith("element:")) observer.observe(row);
			}
		}
		watch(results, observeRows, { flush: "post", immediate: true });
		onBeforeUnmount(() => {
			clearTimeout(previewTimer);
			observer?.disconnect();
			clearRowTimers();
		});
		const insertTarget = computed(() => builder.mode.value === "library"
			? `${builder.activeDefinition.value?.kind === "zvp" ? "ZVP" : "ZVC"}: ${builder.activeDefinition.value?.name ?? ""}`
			: `${builder.translate("zx_builder_template")}: ${builder.activeTemplate.value.name}`);
		const kindLabel = (item) => (item.kind === "element" ? builder.translate("zx_builder_cmd_kind_element") : (item.kind ?? "zvc").toUpperCase());
		const kindClass = (item) => item.kind === "element" ? "bg-zaux-light-grey/40 text-zaux-dark"
			: item.kind === "zvp" ? "bg-utility-notice/30 text-zaux-dark" : "bg-zaux-accent/15 text-zaux-accent";
		// Templates accept every kind; a definition being edited accepts elements and only ZVPs that would not create a cycle.
		function canInsert(item) {
			if (!builder.canEditRemote.value) return false;
			if (builder.mode.value === "template") return true;
			if (builder.isSource.value) return false;
			if (item.kind === "element") return true;
			if (item.kind !== "zvp") return false;
			return builder.selectablePartials.value.some((partial) => partial.exportName === item.exportName);
		}
		function insertTitle(item) {
			if (canInsert(item)) return builder.translate("zx_builder_cmd_insert") + ": " + insertTarget.value;
			if (!builder.canEditRemote.value) return builder.translate("zx_builder_project_readonly");
			if (builder.mode.value === "library" && !builder.isSource.value && (item.kind ?? "zvc") === "zvc") return builder.translate("zx_builder_cmd_insert_zvc");
			return builder.translate("zx_builder_cmd_insert_unavailable");
		}
		function refreshPreview(item) { builder.refreshLibraryThumbnail(item.id); }
		function close() { builder.commandPaletteOpen.value = false; }
		function openItem(item) {
			if (item.kind === "element") return;
			builder.selectLibrary(item.id);
			close();
		}
		function insertItem(item) {
			if (!canInsert(item)) return;
			if (builder.mode.value === "template") {
				builder.templatesOpen.value = false;
				if (item.kind === "element") builder.addTemplateElement(item.name);
				else if (item.kind === "zvp") builder.insertPartial(item.id);
				else builder.insertInstance(item.id);
			} else builder.addElement(item.kind === "element" ? item.name : item.exportName);
			close();
		}
		async function move(step) {
			const count = results.value.length;
			if (!count) return;
			activeIndex.value = (activeIndex.value + step + count) % count;
			await nextTick();
			list.value?.children[activeIndex.value]?.scrollIntoView({ block: "nearest" });
		}
		function onKeydown(event) {
			const item = results.value[activeIndex.value];
			if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
			else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
			else if (event.key === "PageDown") { event.preventDefault(); move(Math.min(8, results.value.length - 1 - activeIndex.value) || 0); }
			else if (event.key === "PageUp") { event.preventDefault(); move(-Math.min(8, activeIndex.value)); }
			else if (event.key === "Enter" && item) {
				event.preventDefault();
				if (event.shiftKey) openItem(item);
				else insertItem(item);
			} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
				// Pressing the opening shortcut again closes the palette instead of printing.
				event.preventDefault();
				close();
			}
		}
		return {
			translate: builder.translate,
			mode: builder.mode,
			libraryId: builder.libraryId,
			containers,
			query, activeIndex, list, listId, optionId, results, insertTarget, activeItem, previewEntry, previewImage, thumbnailOf,
			hasPreview, refreshPreview, kindLabel, kindClass, canInsert, insertTitle, close, openItem, insertItem, onKeydown,
		};
	},
});
</script>
