<template>
	<div class="zb-global-library">
		<div class="mb-1 flex items-center justify-between gap-1">
			<p class="text-[10px] text-zaux-dark-grey" role="status">
				{{ globalCatalogStatus === 'loading' ? translate("zx_builder_global_loading") : entries.length + " " + translate("zx_builder_" + libraryKind) }}
			</p>
			<div class="flex shrink-0 items-center [&>.zb-button]:!w-[24px] [&>.zb-button]:!min-w-[24px] [&>.zb-button]:!p-0.5">
				<BuilderButton size="xs" variant="alt1" icon="refresh" iconOnly :label="translate('zx_builder_hub_refresh')"
					:disabled="globalCatalogStatus === 'loading'" @click="loadGlobalCatalog(true)" />
				<BuilderButton size="xs" variant="alt1" icon="arrow-up-right" iconOnly :label="translate('zx_builder_global_open_designer')"
					@click="openGlobalDesigner()" />
			</div>
		</div>
		<p v-if="globalCatalogStatus === 'error'" role="alert" class="mb-1 rounded-xxs bg-utility-error/10 p-1 text-[11px] text-utility-error">
			{{ translate("zx_builder_global_load_error") }}
		</p>
		<p v-else-if="globalCatalogStatus === 'ready' && !entries.length" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">
			{{ translate(librarySearch.trim() ? "zx_builder_empty_search" : "zx_builder_global_empty_project") }}
		</p>
		<div class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1">
			<article
				v-for="entry in entries"
				:key="entry.id"
				class="zb-library-card group relative overflow-hidden rounded-xs border-slim border-zaux-light-grey transition-colors hover:border-zaux-accent"
				:draggable="canEditRemote && (entry.available || !!entry.definition)"
				@dragstart="startDrag($event, entry)"
				@contextmenu.prevent="openMenu($event, entry)"
			>
				<!-- Same hover action as the project Library cards. -->
				<BuilderButton
					:label="translate('zx_builder_global_insert')"
					variant="light" size="xs" class="absolute left-1/2 top-6 z-30 !hidden -translate-x-1/2 group-hover:!block group-focus-within:!block"
					:disabled="!canEditRemote || !entry.available && !entry.definition"
					@click.stop="insertGlobal(entry.id)"
				/>
				<!-- Thumbnails are generated from the hub management panel only. -->
				<button type="button" class="relative grid h-[120px] w-full place-items-center overflow-hidden bg-zaux-light focus-visible:outline focus-visible:outline-zaux-accent"
					:aria-label="translate('zx_builder_global_insert') + ': ' + entry.name" :disabled="!canEditRemote || !entry.available && !entry.definition" @click="insertGlobal(entry.id)">
					<img v-if="entry.thumbnail" draggable="false" :src="entry.thumbnail" alt="" loading="lazy" class="h-full w-full object-contain object-center" />
					<span v-else class="px-2 text-center text-[10px] text-zaux-dark-grey">{{ translate("zx_builder_global_no_thumbnail") }}</span>
					<span class="pointer-events-none absolute right-1 top-1 rounded-xxs bg-zaux-white/70 px-0.5 py-0.25 font-mono text-[8px] text-zaux-dark-grey">{{ entry.kind.toUpperCase() }}</span>
					<span v-if="entry.definition" class="pointer-events-none absolute left-1 top-1 rounded-xxs bg-zaux-accent px-0.5 py-0.25 text-[8px] font-semibold text-zaux-white">{{ translate("zx_builder_global_linked") }}</span>
				</button>
				<div class="zb-card-body relative px-1 pb-0.5 pt-0.5">
					<p class="truncate text-[11px] font-semibold" :title="entry.name">{{ entry.name }}</p>
					<small class="block truncate font-mono text-[9px] text-zaux-dark-grey">{{ entry.exportName }}</small>
					<p class="mt-0.25 flex flex-wrap gap-0.25 text-[8px] font-semibold">
						<span class="rounded-xxs px-0.5 py-0.25" :class="entry.compatible ? 'bg-zaux-light text-zaux-dark-grey' : 'bg-utility-warning/25 text-zaux-dark'"
							:title="translate(entry.compatible ? 'zx_builder_global_version_match' : 'zx_builder_global_version_mismatch')">
							{{ translate("zx_builder_global_signed", { version: entry.zauxVersion }) }}
						</span>
						<span v-if="entry.updateAvailable" class="rounded-xxs bg-zaux-accent/15 px-0.5 py-0.25 text-zaux-accent">{{ translate("zx_builder_global_update_available") }}</span>
						<span v-if="!entry.available" class="rounded-xxs bg-utility-error/10 px-0.5 py-0.25 text-utility-error">{{ translate("zx_builder_global_archived") }}</span>
					</p>
					<div class="zb-card-actions -mx-0.5 flex items-center justify-between [&_.zb-button]:!w-[24px] [&_.zb-button]:!min-w-[24px] [&_.zb-button]:!p-0.5">
						<BuilderButton size="xs" variant="alt1" icon="enter" iconOnly :label="translate('zx_builder_global_edit') + ': ' + entry.name"
							:disabled="!entry.available" @click="openGlobalDesigner(entry.id)" />
						<!-- The card clips its content, so the menu is one shared fixed-position menu (see below). -->
						<BuilderButton size="xs" variant="alt1" icon="more-horizontal" iconOnly aria-haspopup="menu"
							:label="translate('zx_builder_global_actions', { name: entry.name })"
							@click.stop="openMenu($event, entry)" />
					</div>
				</div>
			</article>
		</div>
		<p class="zb-help !mb-2 !mt-1.5 text-[10px] leading-[1.65] text-zaux-dark-grey">{{ translate("zx_builder_global_card_hint") }}</p>
		<!-- Teleported to the body and positioned at the pointer/button, so neither the card nor the panel scroll clips it. -->
		<BuilderDropdown ref="menu" context-menu content-class="!w-max !max-w-max !pb-1"
			:label="menuEntry ? translate('zx_builder_global_actions', { name: menuEntry.name }) : translate('zx_builder_global_category')"
			:items="menuEntry ? entryItems(menuEntry) : []" @select="menuEntry && entryAction($event, menuEntry)">
			<template #trigger><span aria-hidden="true" /></template>
		</BuilderDropdown>
	</div>
</template>
<script>
import { computed, defineComponent, nextTick, onMounted, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";

// Library category "Global" in a project: shared components, their linked copies and resets.
export default defineComponent({
	emits: ["start-drag"],
	setup(_, { emit }) {
		const builder = useBuilder();
		onMounted(() => builder.loadGlobalCatalog());
		const entries = computed(() => {
			const query = builder.librarySearch.value.trim().toLowerCase();
			return builder.globalEntries.value.filter((entry) => entry.kind === builder.libraryKind.value
				&& [entry.name, entry.exportName].some((value) => value.toLowerCase().includes(query)));
		});
		function entryItems(entry) {
			const t = builder.translate;
			const editable = builder.canEditRemote.value;
			return [
				{ id: "insert", icon: "plus", label: t("zx_builder_global_insert"), disabled: !editable || !entry.available && !entry.definition },
				{ id: "import", icon: "download", label: t("zx_builder_global_import"), hidden: !!entry.definition, disabled: !editable || !entry.available },
				{ id: "edit", icon: "enter", label: t("zx_builder_global_edit"), disabled: !entry.available },
				{ id: "update", heading: t("zx_builder_global_sync_heading"), label: t("zx_builder_global_update_only"), hidden: !entry.definition, disabled: !editable || !entry.updateAvailable },
				{ id: "soft", label: t("zx_builder_global_soft_all"), hidden: !entry.definition, disabled: !editable },
				{ id: "hard", label: t("zx_builder_global_hard_all"), hidden: !entry.definition, disabled: !editable, danger: true },
				{ id: "remove", icon: "delete", label: t("zx_builder_global_remove"), separator: true, hidden: !entry.definition, disabled: !editable, danger: true },
			];
		}
		function entryAction(item, entry) {
			if (item.id === "insert") builder.insertGlobal(entry.id);
			else if (item.id === "import") builder.requestGlobalImport(entry.id);
			else if (item.id === "edit") builder.openGlobalDesigner(entry.id);
			else if (item.id === "update") builder.requestGlobalSync(entry.id, { reset: "none" });
			else if (item.id === "soft" || item.id === "hard") builder.requestGlobalSync(entry.id, { reset: item.id });
			else if (item.id === "remove") builder.modal.value = { type: "delete", kind: "library", id: entry.id };
		}
		// Linked copies drag like project components; others carry a 'global' payload whose drop opens
		// the import dialog (version check) and then inserts at the drop position.
		function startDrag(event, entry) {
			const payload = entry.definition
				? entry.kind === "zvp" ? { kind: "catalog", name: entry.definition.exportName } : { kind: "library", id: entry.id }
				: { kind: "global", id: entry.id, zvp: entry.kind === "zvp" };
			emit("start-drag", event, payload);
		}
		const menu = ref(null);
		const menuEntry = ref(null);
		async function openMenu(event, entry) {
			// Read the position before awaiting: currentTarget is cleared once the event has been dispatched.
			const rect = event.currentTarget.getBoundingClientRect();
			const x = event.type === "contextmenu" ? event.clientX : rect.left;
			const y = event.type === "contextmenu" ? event.clientY : rect.bottom;
			menu.value?.close();
			menuEntry.value = entry;
			await nextTick();
			menu.value?.openAt(x, y);
		}
		return { ...builder, entries, entryItems, entryAction, startDrag, menu, menuEntry, openMenu };
	},
});
</script>
