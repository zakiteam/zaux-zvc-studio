<template>
	<!-- Teleported to the body and positioned at the pointer, so neither the card nor the panel scroll clips it. -->
	<BuilderDropdown
		ref="menu"
		context-menu
		content-class="!w-max !max-w-max !pb-1"
		:label="definition ? translate('zx_builder_global_actions', { name: definition.name }) : translate('zx_builder_library')"
		:items="items"
		@select="run"
	>
		<template #trigger><span aria-hidden="true" /></template>
	</BuilderDropdown>
</template>
<script>
import { computed, defineComponent, nextTick, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { isGlobalCandidate } from "../../../domain/global-components.js";

// Right-click menu of the project Library cards (ZVC/ZVP): the card actions plus
// "Send to global library". Open it with open(event, definition).
export default defineComponent({
	name: "BuilderLibraryMenu",
	setup(_, { expose }) {
		const builder = useBuilder();
		const t = builder.translate;
		const menu = ref(null);
		const definition = ref(null);
		const items = computed(() => {
			const entry = definition.value;
			if (!entry) return [];
			const editable = builder.canEditRemote.value;
			const designer = builder.designer;
			const source = entry.id.startsWith("source:");
			return [
				{ id: "edit", icon: "enter", label: t("zx_builder_edit_library") },
				{ id: "insert", icon: "plus", label: t("zx_builder_add_to_template"), hidden: designer, disabled: !editable },
				{ id: "duplicate", icon: "duplicate", label: t("zx_builder_duplicate"), disabled: !editable },
				{ id: "rename", icon: "edit", label: t("zx_builder_rename"), hidden: source, disabled: !editable },
				{ id: "publish", icon: "upload", label: t("zx_builder_global_publish_action"), separator: true, hidden: designer || !isGlobalCandidate(entry), disabled: !editable },
				{ id: "delete", icon: "delete", label: t("zx_builder_delete"), separator: true, hidden: source, disabled: !editable, danger: true },
			];
		});
		function run(item) {
			const entry = definition.value;
			if (!entry) return;
			if (item.id === "edit") builder.selectLibrary(entry.id);
			else if (item.id === "insert") entry.kind === "zvp" ? builder.insertPartial(entry.id) : builder.insertInstance(entry.id);
			else if (item.id === "duplicate") builder.duplicate("library", entry.id);
			else if (item.id === "rename") builder.modal.value = { type: "rename", kind: "library", id: entry.id, name: entry.name };
			else if (item.id === "publish") builder.requestGlobalPublish(entry.id);
			else if (item.id === "delete") builder.modal.value = { type: "delete", kind: "library", id: entry.id };
		}
		async function open(event, entry) {
			// Read the position before awaiting: currentTarget is cleared once the event has been dispatched.
			const rect = event.currentTarget.getBoundingClientRect();
			const x = event.type === "contextmenu" && event.clientX ? event.clientX : rect.left;
			const y = event.type === "contextmenu" && event.clientY ? event.clientY : rect.bottom;
			menu.value?.close();
			definition.value = entry;
			await nextTick();
			menu.value?.openAt(x, y);
		}
		expose({ open });
		return { translate: t, menu, definition, items, run, open };
	},
});
</script>
