<template>
	<ul
		class="zb-file-tree my-0.5 list-none p-0 [&.zb-file-tree--nested]:ml-1 [&.zb-file-tree--nested]:border-l-slim [&.zb-file-tree--nested]:border-zaux-light-grey [&.zb-file-tree--nested]:pl-0.75"
		:class="{ 'zb-file-tree--nested': depth }"
	>
		<li v-for="node in nodes" :key="node.path || node.name" class="relative">
			<button
				v-if="node.type === 'folder'"
				type="button"
				class="zb-file-row flex w-full items-center gap-0.25 rounded-xxs px-0.5 py-1 text-left hover:bg-zaux-light [&>small]:ml-auto [&>small]:text-[9px] [&>small]:text-zaux-dark-grey"
				:aria-expanded="expanded(node) ? 'true' : 'false'"
				@click="$emit('toggle', node.path)"
			>
				<span
					class="grid h-[24px] w-[24px] shrink-0 place-items-center text-[10px] text-zaux-dark-grey"
					aria-hidden="true"
					>{{ expanded(node) ? '▾' : '▸' }}</span
				>
				<span class="min-w-0 flex-1 truncate text-[10px]">{{ node.name }}</span>
				<small>{{ countFiles(node.children) }}</small>
			</button>
			<button
				v-else
				type="button"
				class="zb-file-row flex w-full items-center gap-0.25 rounded-xxs px-0.5 py-1 text-left hover:bg-zaux-light [&.zb-file-row--active]:bg-zaux-accent/5 [&.zb-file-row--active]:text-zaux-accent"
				:class="{ 'zb-file-row--active': selected === node.path }"
				@click="$emit('select', node.path)"
			>
				<span
					class="grid h-[24px] w-[24px] shrink-0 place-items-center text-[10px] text-zaux-dark-grey"
					aria-hidden="true"
					>◇</span
				>
				<span class="min-w-0 flex-1 truncate text-[10px]">{{ node.name }}</span>
			</button>
			<BuilderFileTree
				v-if="node.type === 'folder' && expanded(node)"
				:nodes="node.children"
				:depth="depth + 1"
				:selected="selected"
				:collapsed="collapsed"
				:searching="searching"
				@select="$emit('select', $event)"
				@toggle="$emit('toggle', $event)"
			/>
		</li>
	</ul>
</template>

<script>
	import { defineComponent } from "vue";
	import { countFiles } from "../../../domain/file-tree.js";

	export default defineComponent({
		name: "BuilderFileTree",
		props: {
			nodes: { type: Array, default: () => [] },
			depth: { type: Number, default: 0 },
			selected: { type: String, default: "" },
			collapsed: { type: Object, default: () => new Set() },
			searching: { type: Boolean, default: false },
		},
		emits: ["select", "toggle"],
		setup(props) {
			function expanded(node) {
				return props.searching || !props.collapsed.has(node.path);
			}
			return { expanded, countFiles };
		},
	});
</script>
