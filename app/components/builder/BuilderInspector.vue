<template>
	<aside
		class="zb-inspector flex min-h-0 w-[298px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white max-[1200px]:w-[280px] max-[900px]:h-[60dvh] max-[900px]:!w-full max-[900px]:border-t-slim"
		:style="{ width: `${width}px` }"
	>
		<div
			class="zb-inspector-heading px-2.5 pb-2 pt-3 [&>h2]:mt-1 [&>h2]:text-[16px] [&>h2]:font-medium [&>p]:mt-0.5 [&>p]:font-mono [&>p]:text-[10px] [&>p]:text-zaux-dark-grey"
		>
			<span
				class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
				>{{
					translate(
						mode === "library" ? "zx_builder_component" : "zx_builder_instance",
					)
				}}</span
			>
			<h2>
				{{
					activeDefinition
						? mode === "library"
							? activeDefinition.name
							: activeInstance.name
						: translate("zx_builder_properties")
				}}
			</h2>
			<p v-if="activeDefinition">{{ activeDefinition.exportName }}</p>
		</div>

		<!-- Tabs -->
		<div
			class="zb-tabs flex shrink-0 gap-0.5 border-b-slim border-zaux-light-grey px-1.5 [&>button]:flex-1 [&>button]:border-b-thick [&>button]:border-transparent [&>button]:px-0.75 [&>button]:py-1.5 [&>button]:text-[11px] [&>button]:text-zaux-dark-grey [&>button.active]:border-zaux-accent [&>button.active]:text-zaux-accent"
			role="tablist"
		>
			<button
				v-for="tab in ['properties', 'style', 'data', 'fields', 'code']"
				:key="tab"
				role="tab"
				:aria-selected="inspectorTab === tab"
				:class="{ active: inspectorTab === tab }"
				@click="inspectorTab = tab"
			>
				{{ translate(`zx_builder_${tab}`) }}
			</button>
		</div>

		<!-- Tab content -->
		<div
			data-inspector-scroll
			class="flex-1 h-full min-h-0 overflow-auto zb-scroll"
		>
			<div class="p-2 zb-inspector-content">
				<BuilderSourceInfo v-if="activeDefinition && isSource" />
				<!-- Properties and Code stay mounted so their drafts follow selection changes. -->
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
import BuilderButton from "./BuilderButton.vue";
import BuilderSourceInfo from "./BuilderSourceInfo.vue";
import BuilderInspectorPropertiesTab from "./inspector/BuilderInspectorPropertiesTab.vue";
import BuilderInspectorStyleTab from "./inspector/BuilderInspectorStyleTab.vue";
import BuilderInspectorDataTab from "./inspector/BuilderInspectorDataTab.vue";
import BuilderInspectorFieldsTab from "./inspector/BuilderInspectorFieldsTab.vue";
import BuilderInspectorCodeTab from "./inspector/BuilderInspectorCodeTab.vue";
export default defineComponent({
	components: {
		BuilderButton,
		BuilderSourceInfo,
		BuilderInspectorPropertiesTab,
		BuilderInspectorStyleTab,
		BuilderInspectorDataTab,
		BuilderInspectorFieldsTab,
		BuilderInspectorCodeTab,
	},
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
