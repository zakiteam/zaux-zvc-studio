<template>
	<section class="grid gap-2">
		<p class="text-[12px] font-medium">
			{{ translate("zx_builder_overlay_content") }} ({{ children.length }})
		</p>
		<p
			v-if="!children.length"
			class="text-[11px] text-zaux-dark-grey"
		>
			{{ translate("zx_builder_overlay_empty") }}
		</p>
		<div
			v-for="(child, index) in children"
			:key="child.id"
			class="flex flex-wrap items-center gap-1 py-1 pl-2 pr-1 bg-zaux-light rounded-xs"
		>
			<button
				type="button"
				class="flex-1 min-w-0 text-left truncate"
				@click="select(index)"
			>{{ index + 1 }} · {{ child.name }}</button>
			<BuilderButton
				variant="light"
				icon="edit"
				size="xs"
				:label="translate('zx_builder_overlay_edit')"
				@click="select(index)"
			/>
			<BuilderButton
				variant="light"
				size="xs"
				icon="chevron-up"
				iconOnly
				:label="translate('zx_builder_move_up')"
				:disabled="index === 0"
				@click="move(index, -1)"
			/>
			<BuilderButton
				variant="light"
				size="xs"
				icon="chevron-down"
				iconOnly
				:label="translate('zx_builder_move_down')"
				:disabled="index === children.length - 1"
				@click="move(index, 1)"
			/>
			<BuilderButton
				variant="light"
				size="xs"
				icon="copy"
				iconOnly
				:label="translate('zx_builder_duplicate')"
				@click="duplicate(index)"
			/>
			<BuilderButton
				variant="light"
				size="xs"
				icon="delete"
				iconOnly
				:label="translate('zx_builder_delete')"
				@click="remove(index)"
			/>
		</div>
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
	import BuilderButton from "../../BuilderButton.vue";
	import BuilderDropdown from "../../BuilderDropdown.vue";

	export default defineComponent({
		name: "BuilderOverlayContent",
		components: { BuilderButton, BuilderDropdown },
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
			function remove(index) {
				builder.removeOverlayContent(index);
			}
			function duplicate(index) {
				builder.duplicateOverlayContent(index);
			}
			function move(index, delta) {
				builder.moveOverlayContent(index, delta);
			}
			return { translate, children, contentItems, add, select, remove, duplicate, move };
		},
	});
</script>
