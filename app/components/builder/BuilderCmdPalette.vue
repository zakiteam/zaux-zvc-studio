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
				role="option"
				:aria-selected="index === activeIndex"
				class="group flex cursor-pointer items-center gap-1 rounded-xxs py-0.5 pl-1 pr-1.5"
				:class="index === activeIndex ? 'bg-zaux-light' : ''"
				@mousemove="activeIndex = index"
				@click="openItem(item)"
			>
				<span
					class="w-[30px] shrink-0 rounded-xxs py-0.25 text-center text-[9px] font-semibold"
					:class="(item.kind ?? 'zvc') === 'zvp' ? 'bg-utility-notice/30 text-zaux-dark' : 'bg-zaux-accent/15 text-zaux-accent'"
				>{{ (item.kind ?? 'zvc').toUpperCase() }}</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[12px] font-semibold">{{ item.name }}</span>
					<span class="block truncate text-[10px] text-zaux-dark-grey">
						<span class="font-mono">{{ item.exportName }}</span>
						· {{ translate(item.id === 'source:' + item.sourceKey ? 'zx_builder_library_imported' : 'zx_builder_library_project') }}
						<template v-if="mode === 'library' && item.id === libraryId"> · {{ translate('zx_builder_cmd_current') }}</template>
					</span>
				</span>
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
				<img v-if="previewImage" :src="previewImage" alt="" class="h-full w-full" :class="activeItem.previewImage ? 'object-cover' : 'object-contain object-top'" />
				<span v-else class="px-2 text-center text-[11px] text-zaux-dark-grey" :title="previewEntry?.error">
					{{ translate(previewEntry?.status === 'error' ? 'zx_builder_thumbnail_error' : 'zx_builder_thumbnail_loading') }}
				</span>
			</div>
			<div class="min-w-0">
				<p class="truncate text-[13px] font-semibold" :title="activeItem.name">{{ activeItem.name }}</p>
				<p class="truncate font-mono text-[10px] text-zaux-dark-grey">{{ activeItem.exportName }}</p>
				<p class="text-[10px] text-zaux-dark-grey">
					{{ (activeItem.kind ?? 'zvc').toUpperCase() }} · {{ translate(activeItem.id === 'source:' + activeItem.sourceKey ? 'zx_builder_library_imported' : 'zx_builder_library_project') }}
					<template v-if="activeItem.fields?.length"> · {{ activeItem.fields.length }} {{ translate('zx_builder_fields').toLowerCase() }}</template>
				</p>
			</div>
			<div class="mt-auto flex flex-wrap gap-1">
				<BuilderButton size="xs" icon="enter" tabindex="-1" :extraProps="{ actionIcon: false }" :label="translate('zx_builder_cmd_open')" @click="openItem(activeItem)" />
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
import BuilderButton from "./BuilderButton.vue";
import BuilderModal from "./BuilderModal.vue";

const LIMIT = 60;

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

// Quick-open for ZVC/ZVP definitions: Enter edits, Shift+Enter or the row button inserts into the current context.
export default defineComponent({
	components: { BuilderButton, BuilderModal },
	setup() {
		const builder = useBuilder();
		const query = ref("");
		const activeIndex = ref(0);
		const list = ref(null);
		const listId = useId();
		const optionId = (item) => `${listId}-${item.id.replace(/[^\w-]/g, "_")}`;
		const results = computed(() => {
			const needle = query.value.trim().toLowerCase();
			return builder.document.value.library
				.map((item) => ({ item, score: Math.max(matchScore(item.name, needle), matchScore(item.exportName, needle), matchScore(item.sourceKey, needle)) }))
				.filter((entry) => entry.score > 0)
				.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, builder.language.value, { sensitivity: "base" }))
				.slice(0, LIMIT)
				.map((entry) => entry.item);
		});
		watch(query, () => { activeIndex.value = 0; });
		const activeItem = computed(() => results.value[activeIndex.value] ?? null);
		const previewEntry = computed(() => (activeItem.value ? builder.libraryThumbnails.value[activeItem.value.id] : null));
		const previewImage = computed(() => activeItem.value?.previewImage || previewEntry.value?.url || "");
		// Render a missing thumbnail only once the selection rests, so arrowing through results stays cheap.
		let previewTimer;
		watch(activeItem, (item) => {
			clearTimeout(previewTimer);
			if (item && !item.previewImage) previewTimer = setTimeout(() => builder.ensureLibraryThumbnail(item.id), 250);
		}, { immediate: true });
		onBeforeUnmount(() => clearTimeout(previewTimer));
		const insertTarget = computed(() => builder.mode.value === "library"
			? `${builder.activeDefinition.value?.kind === "zvp" ? "ZVP" : "ZVC"}: ${builder.activeDefinition.value?.name ?? ""}`
			: `${builder.translate("zx_builder_template")}: ${builder.activeTemplate.value.name}`);
		// Templates accept both kinds; a definition being edited accepts only ZVPs that would not create a cycle.
		function canInsert(item) {
			if (!builder.canEditRemote.value) return false;
			if (builder.mode.value === "template") return true;
			if (builder.isSource.value || item.kind !== "zvp") return false;
			return builder.selectablePartials.value.some((partial) => partial.exportName === item.exportName);
		}
		function insertTitle(item) {
			if (canInsert(item)) return builder.translate("zx_builder_cmd_insert") + ": " + insertTarget.value;
			if (!builder.canEditRemote.value) return builder.translate("zx_builder_project_readonly");
			if (builder.mode.value === "library" && item.kind !== "zvp") return builder.translate("zx_builder_cmd_insert_zvc");
			return builder.translate("zx_builder_cmd_insert_unavailable");
		}
		function close() { builder.commandPaletteOpen.value = false; }
		function openItem(item) {
			builder.selectLibrary(item.id);
			close();
		}
		function insertItem(item) {
			if (!canInsert(item)) return;
			if (builder.mode.value === "template") {
				builder.templatesOpen.value = false;
				if (item.kind === "zvp") builder.insertPartial(item.id);
				else builder.insertInstance(item.id);
			} else builder.addElement(item.exportName);
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
				if (event.shiftKey) insertItem(item);
				else openItem(item);
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
			query, activeIndex, list, listId, optionId, results, insertTarget, activeItem, previewEntry, previewImage,
			canInsert, insertTitle, close, openItem, insertItem, onKeydown,
		};
	},
});
</script>
