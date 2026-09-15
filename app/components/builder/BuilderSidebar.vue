<template>
	<aside
		class="zb-sidebar flex min-h-0 w-[254px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white max-[1200px]:w-[230px] max-[900px]:h-[80dvh] max-[900px]:!w-[210px]"
		:style="{ width: `${width}px` }"
	>
		<section
			class="px-1.5 py-2"
			:aria-label="translate('zx_builder_templates')"
		>
			<div class="flex items-center justify-between mb-2">
				<h3 class="mb-1 text-[11px] font-semibold">
					{{ translate("zx_builder_templates") }}
				</h3>
				<BuilderButton @click="openNewTemplateModal" iconOnly size="xs" icon="add" />
			</div>
			<div class="max-h-[300px] overflow-y-auto">
				<div
					v-for="template in document.templates"
					:key="template.id"
					class="flex items-center gap-1"
				>
					<button
						type="button"
						class="min-w-0 flex-1 truncate py-1 text-left text-[12px]"
						:class="{
							'text-zaux-accent font-semibold':
								mode === 'template' && templateId === template.id,
						}"
						:aria-current="
							mode === 'template' && templateId === template.id
								? 'true'
								: undefined
						"
						@click="selectTemplate(template.id)"
					>
						{{ template.name }}
					</button>
					<div>
						<BuilderButton
							icon="edit"
							iconOnly
							size="xs"
							variant="alt1"
							:label="translate('zx_builder_rename') + ': ' + template.name"
							:disabled="!canEditRemote"
							@click="openRenameTplModal(template)"
						/>
						<BuilderButton
							icon="duplicate"
							iconOnly
							size="xs"
							variant="alt1"
							:label="translate('zx_builder_duplicate') + ': ' + template.name"
							:disabled="!canEditRemote"
							@click="duplicate('template', template.id)"
						/>
						<BuilderButton
							icon="close"
							iconOnly
							size="xs"
							variant="alt1"
							:label="translate('zx_builder_delete') + ': ' + template.name"
							:disabled="!canEditRemote"
							@click="remove('template', template.id)"
						/>
					</div>
				</div>
			</div>
		</section>
		<div
			class="zb-tabs flex shrink-0 gap-0.5 border-y-slim border-zaux-light-grey px-1.5 [&>button]:flex-1 [&>button]:border-b-thick [&>button]:border-transparent [&>button]:px-0.75 [&>button]:py-1.5 [&>button]:text-[11px] [&>button]:text-zaux-dark-grey [&>button.active]:border-zaux-accent [&>button.active]:text-zaux-accent"
			role="tablist"
		>
			<button
				v-for="tab in ['library', 'elements', 'outline']"
				:key="tab"
				role="tab"
				:aria-selected="leftTab === tab"
				:class="{ active: leftTab === tab }"
				@click="leftTab = tab"
			>
				{{ translate(`zx_builder_${tab}`) }}
			</button>
		</div>
		<div class="flex-1 h-full min-h-0 overflow-auto zb-scroll">
			<div v-if="leftTab === 'library'" class="zb-library-panel px-2 py-2.5">
				<div
					class="zb-panel-heading mb-2 flex items-center justify-between [&_h2]:text-[16px] [&_h2]:font-medium [&_h2]:tracking-[-0.4px] [&_p]:mt-0.5 [&_p]:text-[10px] [&_p]:text-zaux-dark-grey"
				>
					<div>
						<h2>{{ translate("zx_builder_library") }}</h2>
						<p>
							{{ filteredLibrary.length }}
							{{ translate("zx_builder_" + libraryKind) }}
						</p>
					</div>
					<BuilderDropdown
						:label="translate('zx_builder_create')"
						icon="add"
						:items="createItems"
						:disabled="!canEditRemote"
						@select="modal = { type: $event.id }"
					/>
				</div>
				<div
					class="flex mb-2 border-b-slim border-zaux-light-grey"
					role="tablist"
					:aria-label="translate('zx_builder_library')"
				>
					<button
						v-for="kind in ['zvc', 'zvp']"
						:key="kind"
						type="button"
						role="tab"
						:id="'library-kind-' + kind"
						:aria-controls="'library-panel-' + kind"
						:aria-selected="libraryKind === kind"
						:tabindex="libraryKind === kind ? 0 : -1"
						class="flex-1 py-1.5 text-[11px] border-b-thick"
						:class="
							libraryKind === kind
								? 'border-zaux-accent text-zaux-accent'
								: 'border-transparent text-zaux-dark-grey'
						"
						@click="libraryKind = kind"
						@keydown="libraryKindKeydown"
					>
						{{ translate("zx_builder_" + kind) }}
					</button>
				</div>
				<div class="flex flex-col gap-1 mb-2">
					<BuilderInput
						v-model="libraryCategory"
						type="select"
						:label="translate('zx_builder_library_category')"
						:options="[
							{
								value: 'imported',
								label: translate('zx_builder_library_imported'),
							},
							{
								value: 'project',
								label: translate('zx_builder_library_project'),
							},
						]"
					/>
					<BuilderInput
						v-model="librarySearch"
						type="search"
						:label="translate('zx_builder_library_search')"
						:placeholder="translate('zx_builder_library_search')"
					/>
				</div>
				<p
					v-if="!filteredLibrary.length"
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{
						translate(
							librarySearch.trim()
								? "zx_builder_empty_search"
								: "zx_builder_library_empty",
						)
					}}
				</p>
				<div
					class="grid grid-cols-2 gap-1"
					role="tabpanel"
					:id="'library-panel-' + libraryKind"
					:aria-labelledby="'library-kind-' + libraryKind"
					tabindex="0"
				>
					<article
						v-for="(definition, index) in filteredLibrary"
						:key="definition.id"
						class="zb-library-card overflow-hidden rounded-xs border-slim border-zaux-light-grey transition-colors hover:border-zaux-accent [&.active]:border-zaux-accent"
						:class="{
							active: mode === 'library' && libraryId === definition.id,
						}"
						:draggable="canEditRemote"
						@dragstart="
							drag(
								$event,
								definition.kind === 'zvp'
									? { kind: 'catalog', name: definition.exportName }
									: { kind: 'library', id: definition.id },
							)
						"
					>
						<button
							class="zb-library-thumb relative grid group h-[112px] w-full place-items-center overflow-hidden bg-zaux-light [&.zb-library-thumb--1]:bg-zaux-light-grey/30 [&.zb-library-thumb--2]:bg-zaux-accent/10"
							:class="`zb-library-thumb--${index % 3}`"
							:aria-label="`${translate('zx_builder_edit_library')}: ${definition.name}`"
							@click="selectLibrary(definition.id)"
						>
							<BuilderButton
								class="absolute z-10 hidden top-1 left-1 group-hover:block"
								variant="light1"
								icon="media"
								iconOnly
								:label="translate('zx_builder_media_preview')"
								size="xs"
								:disabled="!canEditRemote"
								@click="previewId = definition.id"
							/>
							<img
								v-if="definition.previewImage"
								:src="definition.previewImage"
								alt=""
								loading="lazy"
								class="absolute inset-0 object-cover w-full h-full"
							/>
							<span
								v-else
								class="zb-mini-layout relative h-[78px] w-[140px] -rotate-3 rounded-xxs bg-zaux-white px-1.5 py-2 shadow-closer [&>i]:my-0.75 [&>i]:block [&>i]:h-[5px] [&>i]:w-[55px] [&>i]:rounded-[1px] [&>i]:bg-zaux-light-grey [&>i:nth-child(2)]:w-[38px] [&>i:nth-child(3)]:h-[9px] [&>i:nth-child(3)]:w-[22px] [&>i:nth-child(3)]:bg-zaux-accent [&>b]:absolute [&>b]:right-1.5 [&>b]:top-2 [&>b]:h-[50px] [&>b]:w-[47px] [&>b]:rounded-t-l [&>b]:rounded-b-xxs [&>b]:bg-zaux-light-accent/30"
								><i></i><i></i><i></i><b></b></span
							><span
								class="zb-card-type absolute right-1 top-1 rounded-xxs bg-zaux-white/70 px-0.5 py-0.25 font-mono text-[8px] text-zaux-dark-grey"
								>{{
									definition.kind === "zvp"
										? "ZVP"
										: definition.sourceKey
											? translate("zx_builder_from_code")
											: "ZVC"
								}}</span
							>
						</button>
						<div
							class="zb-card-body px-1.5 pb-1 pt-1.5 [&>small]:mt-0.5 [&>small]:block [&>small]:font-mono [&>small]:text-[9px] [&>small]:text-zaux-dark-grey"
						>
							<div>
								<button
									class="zb-card-name block w-full text-left text-[12px] font-semibold"
									@click="selectLibrary(definition.id)"
								>
									{{ definition.name }}
								</button>
								<small class="block mb-2">{{ definition.exportName }}</small>
							</div>
							<div
								class="zb-card-actions mt-1.5 flex items-center gap-0.5 border-t-slim border-zaux-light pt-0.75 [&>.zb-button]:flex-1 [&>.zb-button]:!px-0.25 [&>.zb-button]:!text-[10px]"
							>
								<BuilderButton
									:label="
										translate(
											definition.kind === 'zvp'
												? 'zx_builder_add_partial'
												: 'zx_builder_add_to_template',
										)
									"
									icon="add"
									variant="alt1"
									@click="
										definition.kind === 'zvp'
											? insertPartial(definition.id)
											: insertInstance(definition.id)
									"
								/>
								<BuilderButton
									icon="duplicate"
									iconOnly
									size="xs"
									variant="alt1"
									class="!flex-none"
									:label="
										translate('zx_builder_duplicate') + ': ' + definition.name
									"
									:disabled="!canEditRemote"
									@click.stop="duplicate('library', definition.id)"
								/>
								<button
									v-if="!definition.id.startsWith('source:')"
									class="zb-icon-text w-[18px] text-zaux-dark-grey hover:text-zaux-accent"
									:aria-label="`${translate('zx_builder_rename')}: ${definition.name}`"
									@click="
										modal = {
											type: 'rename',
											kind: 'library',
											id: definition.id,
											name: definition.name,
										}
									"
								>
									✎</button
								><button
									v-if="!definition.id.startsWith('source:')"
									class="zb-icon-text w-[18px] text-zaux-dark-grey hover:text-zaux-accent"
									:aria-label="`${translate('zx_builder_delete')}: ${definition.name}`"
									@click="
										modal = {
											type: 'delete',
											kind: 'library',
											id: definition.id,
										}
									"
								>
									×
								</button>
							</div>
						</div>
					</article>
				</div>
				<p
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_library_drag") }}
				</p>
			</div>
			<div
				v-else-if="leftTab === 'elements'"
				class="zb-elements-panel px-2 py-2.5 [&>input]:mb-0.5 [&_h3]:mb-1 [&_h3]:mt-3"
			>
				<BuilderInput
					v-model="search"
					type="search"
					:placeholder="translate('zx_builder_search')"
					:label="translate('zx_builder_search')"
				/>
				<p
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_drag_hint") }}
				</p>
				<p
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_palette_hint") }}
				</p>
				<div
					v-for="group in [
						'zx_builder_partials',
						'zx_builder_zaux',
						'zx_builder_native',
					]"
					:key="group"
				>
					<h3
						class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
					>
						{{ translate(group) }}
					</h3>
					<div
						class="zb-element-list flex flex-col gap-0.5 [&>button]:flex [&>button]:cursor-grab [&>button]:items-center [&>button]:gap-1.5 [&>button]:rounded-xxs [&>button]:border-slim [&>button]:border-zaux-light-grey [&>button]:p-1.5 [&>button]:text-left [&>button]:text-[11px] [&>button:hover]:border-zaux-accent [&>button:hover]:bg-zaux-light"
					>
						<button
							v-for="entry in filtered.filter((item) => item.group === group)"
							:key="entry.name"
							:draggable="canEditRemote"
							@dragstart="drag($event, { kind: 'catalog', name: entry.name })"
							@click="addElement(entry.name)"
						>
							<span
								class="zb-element-icon grid h-[24px] w-[24px] place-items-center rounded-xxs bg-zaux-light text-[17px] text-zaux-accent"
								>{{ containers.includes(entry.name) ? "▤" : "◇" }}</span
							><span>{{ entry.name }}</span
							><span class="ml-auto zb-drag-grip text-zaux-light-grey">⠿</span>
						</button>
					</div>
				</div>
				<p
					v-if="!filtered.length"
					class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_empty_search") }}
				</p>
			</div>
			<div v-else class="zb-outline-panel px-2 py-2.5">
				<p class="mb-2 text-[10px] leading-relaxed text-zaux-dark-grey">
					{{ translate("zx_builder_outline_drag_hint") }}
				</p>
				<template v-if="mode === 'library'"
					><div class="flex items-center gap-0.5">
						<button
							type="button"
							class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[10px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
							:aria-expanded="
								!collapsedOutline.has('definition:' + activeDefinition?.id)
							"
							:aria-label="
								translate(
									collapsedOutline.has('definition:' + activeDefinition?.id)
										? 'zx_builder_expand'
										: 'zx_builder_collapse',
								) +
								': ' +
								activeDefinition?.name
							"
							@click.stop="toggleOutline('definition:' + activeDefinition?.id)"
							@dragstart.stop.prevent
						>
							<span aria-hidden="true">{{
								collapsedOutline.has("definition:" + activeDefinition?.id)
									? "▸"
									: "▾"
							}}</span>
						</button>
						<h3
							class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
						>
							{{ activeDefinition?.name }}
						</h3>
					</div>
					<template
						v-if="!collapsedOutline.has('definition:' + activeDefinition?.id)"
					>
						<p
							v-if="activeDefinition?.sourceKey"
							class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
						>
							{{ translate("zx_builder_source_outline") }}
						</p>
						<BuilderTree
							v-else-if="activeDefinition"
							:nodes="activeDefinition.tree"
							instance="library"
						/> </template
				></template>
				<template v-else
					><article
						v-for="instance in activeTemplate.instances"
						:key="instance.id"
						class="zb-instance relative mb-2 rounded-xxs border-slim border-zaux-light-grey p-1 [&.active]:border-zaux-accent"
						:class="{ active: instanceId === instance.id }"
						:draggable="canEditRemote"
						@dragstart.stop="
							drag($event, { kind: 'instance', id: instance.id })
						"
						@dragover="outlineDrag.over($event, null, instance.id, true)"
						@dragleave="outlineDrag.leave"
						@drop="outlineDrag.drop($event, null, instance.id, true)"
					>
						<span
							v-if="outlineDrag.position(null, instance.id, true)"
							aria-hidden="true"
							class="pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-zaux-accent"
							:class="
								outlineDrag.position(null, instance.id, true) === 'before'
									? 'top-0'
									: 'bottom-0'
							"
						/>
						<div class="zb-instance-heading flex min-w-0 items-center gap-0.25">
							<button
								type="button"
								class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[10px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
								:aria-expanded="
									!collapsedOutline.has('instance:' + instance.id)
								"
								:aria-label="
									translate(
										collapsedOutline.has('instance:' + instance.id)
											? 'zx_builder_expand'
											: 'zx_builder_collapse',
									) +
									': ' +
									instance.name
								"
								@click.stop="toggleOutline('instance:' + instance.id)"
								@dragstart.stop.prevent
							>
								<span aria-hidden="true">{{
									collapsedOutline.has("instance:" + instance.id) ? "▸" : "▾"
								}}</span>
							</button>
							<button
								class="zb-instance-name flex min-w-0 flex-1 items-center gap-1 truncate px-0.25 py-0.5 text-left !text-[11px] font-medium [&>span]:text-zaux-dark-grey"
								@click="selectInstance(instance.id)"
							>
								<span>⠿</span>{{ instance.name }}
							</button>
							<div
								class="zb-instance-tools flex shrink-0 items-center gap-[1px] [&>.zb-button]:!min-w-[25px] [&>.zb-button]:!w-[25px] [&>.zb-button]:!p-0.5"
							>
								<BuilderButton
									icon="duplicate"
									iconOnly
									variant="alt1"
									:label="`${translate('zx_builder_duplicate')}: ${instance.name}`"
									@click="duplicate('instance', instance.id)"
								/>
								<BuilderButton
									icon="delete"
									variant="alt1"
									iconOnly
									:label="`${translate('zx_builder_delete')}: ${instance.name}`"
									@click="remove('instance', instance.id)"
								/>
							</div>
						</div>
						<template v-if="!collapsedOutline.has('instance:' + instance.id)">
							<div
								v-if="instanceId === instance.id"
								class="zb-instance-actions flex justify-between gap-0.5 pb-1.5 pt-0.5 text-[9px] text-zaux-dark-grey [&>button:hover]:text-zaux-accent"
							>
								<button
									@click="
										modal = {
											type: 'rename',
											kind: 'instance',
											id: instance.id,
											name: instance.name,
										}
									"
								>
									{{ translate("zx_builder_rename") }}
								</button>
							</div>
							<div v-if="instanceId === instance.id" class="px-0.5 pb-1.5">
								<div class="flex items-center gap-1">
                                  <BuilderButton size="xs" class="min-w-0 flex-1"
                                    :label="translate('zx_builder_restore_library')"
                                    :disabled="!canEditRemote || !instanceLibraryDefinition"
                                    @click="restoreActiveInstance" />
                                  <BuilderButton size="xs" icon="edit" iconOnly variant="alt1"
                                    :label="translate('zx_builder_edit_library')"
                                    :disabled="!instanceLibraryDefinition"
                                    @click="instanceLibraryDefinition && selectLibrary(instanceLibraryDefinition.id)" />
                                </div>
								<p class="mt-1 text-[10px] leading-relaxed text-zaux-dark-grey">
									{{
										translate(
											instanceLibraryDefinition
												? "zx_builder_restore_library_hint"
												: "zx_builder_restore_library_missing",
										)
									}}
								</p>
								<details
									v-if="instance.unmappedProperties?.length"
									class="mt-1 mb-0 text-[10px]"
								>
									<summary class="pb-0">
										{{ translate("zx_builder_restore_unmapped") }}
									</summary>
									<BuilderCodeEditor
										:modelValue="
											JSON.stringify(instance.unmappedProperties, null, 2)
										"
										:label="translate('zx_builder_restore_unmapped')"
										readonly
										rows="10"
									/>
								</details>
							</div>
							<button
								v-if="instance.definition.sourceKey"
								class="zb-source-outline px-1.5 py-1 text-left text-[10px] text-zaux-accent"
								@click="selectInstance(instance.id)"
							>
								{{ translate("zx_builder_source_outline") }}</button
							><BuilderTree
								v-else
								:nodes="instance.definition.tree"
								:instance="instance.id"
							/>
						</template></article
				></template>
			</div>
		</div>
		<div
			class="zb-sidebar-footer flex items-center justify-between border-t-slim border-zaux-light-grey px-2 py-1.5 text-[11px] text-zaux-dark-grey [&>select]:w-[58px] [&>select]:p-0.5 [&>select]:text-[10px] [&_small]:ml-0.5 [&_small]:text-[9px]"
		>
			<span>Zaux Studio <small>0.1</small></span
			><BuilderInput
				class="!w-[58px] !p-0.5 !text-[10px]"
				type="select"
				:modelValue="language"
				:label="translate('zx_builder_language')"
				:options="[
					{ value: 'it', label: 'IT' },
					{ value: 'en', label: 'EN' },
				]"
				@update:modelValue="setLanguage"
			/>
		</div>
		<BuilderMediaPicker
			v-if="previewId"
			scopeOnly="global"
			clearable
			@close="previewId = null"
			@select="setPreview"
		/>
	</aside>
</template>
<script>
import BuilderMediaPicker from "./BuilderMediaPicker.vue";
import { defineComponent, computed, ref } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { catalog, containers } from "../../services/catalog.js";
import { createBuilderOutlineDrag } from "../../composables/useBuilderOutlineDrag.js";
import BuilderDropdown from "./BuilderDropdown.vue";
import BuilderButton from "./BuilderButton.vue";
import BuilderCodeEditor from "./fields/BuilderCodeEditor.vue";
import BuilderTree from "./BuilderTree.vue";
import BuilderInput from "./fields/BuilderInput.vue";
export default defineComponent({
	components: {
		BuilderDropdown,
		BuilderCodeEditor,
		BuilderButton,
		BuilderTree,
		BuilderInput,
		BuilderMediaPicker,
	},
	props: { width: { default: 254 } },
	setup() {
		const builder = useBuilder();
		const outlineDrag = createBuilderOutlineDrag(builder);
		const search = ref("");
		const createItems = computed(() => [
			{
				id: "new-component",
				label: builder.translate("zx_builder_new_component"),
			},
			{ id: "new-partial", label: builder.translate("zx_builder_new_partial") },
			{
				id: "new-component-json",
				label: builder.translate("zx_builder_new_component_json"),
			},
			{
				id: "new-partial-json",
				label: builder.translate("zx_builder_new_partial_json"),
			},
		]);
		function libraryKindKeydown(event) {
			if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
				return;
			event.preventDefault();
			builder.libraryKind.value =
				event.key === "Home"
					? "zvc"
					: event.key === "End"
						? "zvp"
						: builder.libraryKind.value === "zvc"
							? "zvp"
							: "zvc";
			event.currentTarget.parentElement
				.querySelector("#library-kind-" + builder.libraryKind.value)
				?.focus();
		}
		const filteredLibrary = computed(() => {
			const query = builder.librarySearch.value.trim().toLowerCase();
			return builder.document.value.library.filter((definition) => {
				const imported = definition.id === "source:" + definition.sourceKey;
				return (
					(definition.kind ?? "zvc") === builder.libraryKind.value &&
					imported === (builder.libraryCategory.value === "imported") &&
					[
						definition.name,
						definition.exportName,
						definition.sourceKey ?? "",
					].some((value) => value.toLowerCase().includes(query))
				);
			});
		});
		const previewId = ref(null);
		function setPreview(asset) {
			builder.updateLibraryPreview(previewId.value, asset?.url);
			previewId.value = null;
		}
		const availablePartialEntries = computed(() =>
			builder.selectablePartials.value.map((partial) => ({
				name: partial.exportName,
				group: "zx_builder_partials",
			})),
		);
		const filtered = computed(() =>
			[...availablePartialEntries.value, ...catalog].filter((entry) =>
				entry.name.toLowerCase().includes(search.value.toLowerCase()),
			),
		);
		const drag = outlineDrag.start;

		function openNewTemplateModal(){
			builder.modal.value = { type: "new-template" };
		}

		function openRenameTplModal(template) {
			builder.modal.value = { 
				type: 'rename',
				kind: "template",
				id: template.id,
				name: template.name,
			};
		}

		return {
			...builder,
			createItems,
			libraryKindKeydown,
			search,
			filtered,
			filteredLibrary,
			containers,
			drag,
			outlineDrag,
			previewId,
			setPreview,
			openNewTemplateModal,
			openRenameTplModal,
		};
	},
});
</script>
