<template>
	<div
		class="zb-file-explorer grid h-[520px] grid-cols-[300px_minmax(0,1fr)] overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white"
	>
		<aside class="flex min-h-0 flex-col border-r-slim border-zaux-light-grey">
			<div class="shrink-0 border-b-slim border-zaux-light-grey p-1.5">
				<input
					v-model="query"
					type="search"
					class="w-full px-2 py-1 border-none bg-zaux-light text-[11px]"
					:placeholder="translate('zx_builder_starter_search_files')"
					:aria-label="translate('zx_builder_starter_search_files')"
				/>
			</div>
			<div class="min-h-0 flex-1 overflow-auto p-1.5">
				<BuilderFileTree
					v-if="visibleNodes.length"
					:nodes="visibleNodes"
					:selected="selected"
					:collapsed="collapsed"
					:searching="!!query.trim()"
					@select="$emit('update:selected', $event)"
					@toggle="toggle"
				/>
				<p v-else-if="hasFiles" class="px-0.5 py-2 text-[11px] text-zaux-dark-grey">
					{{ translate('zx_builder_starter_no_results') }}
				</p>
			</div>
		</aside>
		<div class="min-h-0 min-w-0 overflow-hidden bg-zaux-white">
			<BuilderCodeEditor
				class="h-full"
				fill
				readonly
				:language="language"
				:modelValue="content"
				:label="selected || translate('zx_builder_export')"
			/>
		</div>
	</div>
</template>

<script>
	import { computed, defineComponent, reactive, ref, watch } from "vue";
	import { useTranslation } from "../../composables/useTranslation.js";
	import BuilderCodeEditor from "./fields/BuilderCodeEditor.vue";
	import BuilderFileTree from "./BuilderFileTree.vue";
	import { buildFileTree, filterFileTree } from "../../../domain/file-tree.js";

	export default defineComponent({
		name: "BuilderFileExplorer",
		components: { BuilderCodeEditor, BuilderFileTree },
		props: {
			files: { type: Object, default: () => ({}) },
			selected: { type: String, default: "" },
		},
		emits: ["update:selected"],
		setup(props) {
			const { translate } = useTranslation();
			const query = ref("");
			const collapsed = reactive(new Set());
			const hasFiles = computed(() => Object.keys(props.files).length > 0);
			const tree = computed(() => buildFileTree(Object.keys(props.files)));
			const visibleNodes = computed(() => filterFileTree(tree.value, query.value));
			const content = computed(() => props.files[props.selected] ?? "");
			const language = computed(() => {
				const file = props.selected || "";
				if (file.endsWith(".css")) return "css";
				if (file.endsWith(".html")) return "html";
				if (file.endsWith(".json")) return "json";
				return "javascript";
			});
			watch(
				() => props.files,
				() => collapsed.clear(),
			);
			function toggle(path) {
				if (collapsed.has(path)) collapsed.delete(path);
				else collapsed.add(path);
			}
			return { translate, query, collapsed, hasFiles, visibleNodes, content, language, toggle };
		},
	});
</script>
