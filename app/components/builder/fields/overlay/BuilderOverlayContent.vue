<template>
	<section class="grid gap-2">
		<p class="text-[12px] font-medium">
			{{ translate("zx_builder_overlay_content") }} ({{ children.length }})
		</p>
		<BuilderSortableList
			:items="children"
			:label="translate('zx_builder_overlay_content')"
			openable
			:itemKey="(child) => child.id"
			:itemLabel="(child, index) => `${index + 1} · ${child.name}`"
			:emptyText="translate('zx_builder_overlay_empty')"
			@open="select"
			@change="change"
		/>
		<BuilderDropdown
			:label="translate('zx_builder_overlay_add')"
			:items="contentItems"
			:filterItems="true"
			@select="add"
		/>
	</section>
</template>
<script>
	import { computed, defineComponent } from "vue";
	import { useBuilder } from "../../../../composables/useBuilder.js";
	import { catalog } from "../../../../services/catalog.js";
	import { useTranslation } from "../../../../composables/useTranslation.js";

	export default defineComponent({
		name: "BuilderOverlayContent",
		props: { node: Object },
		setup(props) {
			const { translate } = useTranslation();
			const builder = useBuilder();
			const children = computed(() => props.node?.children ?? []);
			const contentItems = computed(() => {
				const zaux = catalog.filter((entry) => !entry.html);
				const html = catalog.filter((entry) => entry.html);
				const partials = builder.selectablePartials.value.map((item) => ({
					id: item.exportName,
					label: item.name + " (ZVP)",
				}));
				return [
					...(zaux.length ? [{ heading: translate("zx_builder_zaux") }] : []),
					...zaux.map((entry) => ({ id: entry.name, label: entry.name })),
					...(html.length ? [{ heading: translate("zx_builder_native") }] : []),
					...html.map((entry) => ({ id: entry.name, label: entry.name })),
					...(partials.length
						? [{ separator: true }, { heading: translate("zx_builder_partials") }]
						: []),
					...partials,
				];
			});
			function add(item) {
				builder.insertOverlayContent(item.id);
			}
			function select(index) {
				const child = children.value[index];
				if (!child) return;
				builder.selectInstance(builder.instanceId.value, child.id);
				builder.reveal(builder.instanceId.value, child.id);
			}
			// Children are tree nodes: each list operation goes through the builder (one undoable commit).
			function change(_list, op) {
				if (op.type === "remove") builder.removeOverlayContent(op.index);
				else if (op.type === "duplicate") builder.duplicateOverlayContent(op.index);
				else if (op.type === "move") builder.moveOverlayContent(op.from, op.to - op.from);
			}
			return { translate, children, contentItems, add, select, change };
		},
	});
</script>
