<template>
	<aside
		class="zb-inspector flex min-h-0 min-w-0 w-[298px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white [overflow-wrap:anywhere] max-[1200px]:w-[280px] max-[900px]:h-[60dvh] max-[900px]:!w-full max-[900px]:border-t-slim"
		:style="{ width: `${width}px` }"
	>
		<div class="zb-inspector-heading flex h-[44px] shrink-0 items-center gap-1 border-b-slim border-zaux-light-grey px-1.5">
			<span aria-hidden="true" class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs bg-zaux-light text-[11px] text-zaux-accent">{{ mode === "library" ? "◆" : "◇" }}</span>
			<div class="flex-1 min-w-0">
				<h2 class="truncate text-[12px] font-semibold leading-tight" :title="activeDefinition ? (mode === 'library' ? activeDefinition.name : activeInstance?.name) : undefined">
					{{
						activeDefinition
							? mode === "library"
								? activeDefinition.name
								: activeInstance.name
							: translate("zx_builder_properties")
					}}
				</h2>
				<p class="truncate text-[9px] leading-tight text-zaux-dark-grey">
					<span class="font-semibold uppercase tracking-[1px]">{{ translate(mode === "library" ? "zx_builder_component" : "zx_builder_instance") }}</span>
					<span v-if="activeDefinition" class="font-mono"> · {{ mode === 'template' && activeInstance?.kind === 'free' ? translate('zx_builder_free_element') : activeDefinition.exportName }}</span>
				</p>
			</div>
		</div>

		<BuilderVariants v-if="activeDefinition && (mode === 'library' || activeInstance?.kind !== 'free')" :key="activeDefinition.id" />
		<!-- Tabs -->
		<div
			class="zb-tabs flex h-[36px] shrink-0 items-center gap-[2px] border-b-slim border-zaux-light-grey px-1 [&>button]:min-w-0 [&>button]:flex-1 [&>button]:truncate [&>button]:rounded-xxs [&>button]:px-0.5 [&>button]:py-0.5 [&>button]:text-[11px] [&>button]:font-semibold [&>button]:text-zaux-dark-grey [&>button:hover]:text-zaux-dark [&>button.active]:bg-zaux-light [&>button.active]:text-zaux-dark"
			role="tablist"
		>
			<button
				v-for="tab in ['properties', 'style', 'data', 'fields', 'code']"
				:key="tab"
				role="tab"
				:aria-selected="inspectorTab === tab"
				:class="{ active: inspectorTab === tab }"
				:title="translate(`zx_builder_${tab}`)"
				@click="inspectorTab = tab"
			>
				{{ translate(`zx_builder_${tab}`) }}
			</button>
		</div>

		<!-- Tab content -->
		<div
			data-inspector-scroll
			class="flex-1 h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto zb-scroll"
		>
			<div class="px-1.5 py-1.5 zb-inspector-content" :key="`${activeDefinition?.id}-${activeDefinition?.activeVariant ?? ''}`">
				<BuilderSourceInfo v-if="activeDefinition && isSource" />
				<!-- Keep drafts across tabs, but reset them when changing definition or variant. -->
				<BuilderInspectorPropertiesTab
					:active="inspectorTab === 'properties'"
					@error="localError = $event"
				/>
				<BuilderInspectorStyleTab :active="inspectorTab === 'style'" />
				<BuilderInspectorDataTab :active="inspectorTab === 'data'" />
				<BuilderInspectorFieldsTab
					v-if="activeDefinition && inspectorTab === 'fields'"
					:key="`${activeDefinition.id}-${isSource}`"
				/>
				<BuilderInspectorCodeTab
					:active="inspectorTab === 'code'"
					@error="localError = $event"
				/>
				<div
					v-if="!activeDefinition"
					class="zb-inspector-empty px-1 py-4 text-center [&>span]:mb-2 [&>span]:block [&>span]:text-[34px] [&>span]:font-light [&>span]:text-zaux-light-grey [&>p]:mb-2 [&>p]:text-[12px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"
				>
					<span>◇</span>
					<p>{{ translate("zx_builder_empty_hint") }}</p>
					<BuilderButton
						class="mx-auto"
						size="xs"
						:label="translate('zx_builder_new_component')"
						@click="modal = { type: 'new-component' }"
					/>
				</div>
				<p
					v-if="localError"
					class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
					role="alert"
				>
					{{ translate(localError) }}
				</p>
			</div>
		</div>
	</aside>
</template>
<script>
import { defineComponent, ref, watch } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
export default defineComponent({
	props: { width: { default: 298 } },
	setup() {
		const builder = useBuilder();
		const localError = ref("");
		watch(
			builder.selectedNode,
			() => { localError.value = ""; },
			{ deep: true },
		);
		return { ...builder, localError };
	},
});
</script>
