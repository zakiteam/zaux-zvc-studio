<template>
	<aside
		class="zb-sidebar flex min-h-0 w-[264px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white max-[900px]:h-[80dvh] max-[900px]:!w-[210px]"
		:style="{ width: `${width}px` }"
	>
		<!-- Panel tabs. Dragging over a tab opens it, so assets can be dropped into the structure. -->
		<div
			class="flex h-[40px] shrink-0 items-center gap-0.5 border-b-slim border-zaux-light-grey px-1"
			role="tablist"
			:aria-label="translate('zx_builder_left_panel')"
		>
			<button
				v-for="tab in tabs"
				:key="tab.id"
				type="button"
				role="tab"
				:id="'zb-left-tab-' + tab.id"
				:aria-controls="'zb-left-panel-' + tab.id"
				:aria-selected="leftTab === tab.id"
				:tabindex="leftTab === tab.id ? 0 : -1"
				class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
				:class="leftTab === tab.id ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
				@click="leftTab = tab.id"
				@keydown="tabKeydown"
				@dragenter="springTab($event, tab.id)"
				@dragleave="cancelSpring"
				@drop="cancelSpring"
			>
				{{ translate(tab.label) }}
			</button>
		</div>

		<!-- Structure: templates (pages) and the layer outline. -->
		<section
			v-show="leftTab === 'layers'"
			id="zb-left-panel-layers"
			role="tabpanel"
			aria-labelledby="zb-left-tab-layers"
			class="flex flex-col flex-1 min-h-0 zb-outline-panel"
		>
			<BuilderPages />
			<div
				id="zb-outline-section-content"
				class="flex-1 min-h-0 px-1 pb-2 overflow-auto zb-scroll"
				@dragover.capture="outlineDrag.scrollOver"
				@dragleave="outlineDrag.scrollLeave"
			>
				<div data-zb-outline-tools class="sticky top-0 z-10 -mx-1 bg-zaux-white px-1">
					<div class="flex h-[32px] items-center justify-between gap-1">
						<h3 class="zb-eyebrow truncate pl-0.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
							{{ translate("zx_builder_outline") }}
						</h3>
						<div class="flex shrink-0 items-center [&>.zb-button]:!w-[26px] [&>.zb-button]:!min-w-[26px] [&>.zb-button]:!p-0.5">
							<BuilderButton variant="alt1" size="xs" icon="copy" iconOnly :label="translate('zx_builder_copy_node') + ' (Ctrl C)'" :disabled="!canCopyNode" @click="copySelectedNode()" />
							<BuilderButton variant="alt1" size="xs" icon="document-add" iconOnly :label="translate('zx_builder_paste_node') + ' (Ctrl V)'" :disabled="!canPasteNode" @click="pasteNode()" />
							<BuilderButton v-if="mode === 'library'" variant="alt1" size="xs" icon="loop" iconOnly
								:label="translate('zx_builder_sync_instances') + ': ' + translate('zx_builder_sync_instances_hint')"
								:disabled="!canEditRemote || !activeDefinition"
								@click="syncActiveLibraryInstances" />
							<BuilderButton variant="alt1" size="xs" icon="dropdown-close" iconOnly :label="translate('zx_builder_collapse_all')" @click="collapseAllOutline()" />
							<BuilderButton variant="alt1" size="xs" icon="help" iconOnly :label="translate('zx_builder_outline_help')"
								:aria-pressed="hintsOpen" :aria-expanded="hintsOpen" aria-controls="zb-outline-hints"
								:extraProps="{ inheritedUIFlags: { HOVER: hintsOpen } }" @click="hintsOpen = !hintsOpen" />
						</div>
					</div>
					<div v-if="hintsOpen" id="zb-outline-hints" class="mb-1 space-y-0.5 rounded-xxs bg-zaux-light p-1 text-[10px] leading-relaxed text-zaux-dark-grey">
						<p>{{ translate('zx_builder_outline_shift_hint') }}</p>
						<p>{{ translate("zx_builder_outline_drag_hint") }}</p>
						<p v-if="mode === 'library'">{{ translate('zx_builder_sync_instances_hint') }}</p>
					</div>
					<button v-if="clipboardNodeName" type="button" class="mb-1 flex w-full min-w-0 items-center gap-1 rounded-xxs border-slim border-dashed border-zaux-accent/50 px-1 py-0.5 text-left text-[10px] text-zaux-accent cursor-grab" :draggable="canEditRemote" :disabled="!canEditRemote" :title="translate('zx_builder_drag_copied_node')" @dragstart="drag($event, { kind: 'clipboard' })" @click="pasteNode()">
						<span aria-hidden="true">⠿</span><span class="truncate">{{ translate('zx_builder_copied_node') }}: {{ clipboardNodeName }}</span>
					</button>
					<div v-if="outlineSelection.length > 1" class="mb-1 flex items-center gap-1 rounded-xxs bg-zaux-accent/10 px-1 py-0.5 text-[10px]" role="status">
						<span class="flex-1">{{ outlineSelection.length }} {{ translate('zx_builder_outline_selected') }}</span>
						<BuilderButton v-if="outlineGroupRange" size="xs" variant="alt1" :disabled="!canEditRemote" :label="translate('zx_builder_group_zvc')"
							@click="modal = { type: 'group-zvc', ...outlineGroupRange }" />
					</div>
				</div>
				<template v-if="mode === 'library'"
					><div class="flex items-center gap-0.5" data-zb-outline-definition>
						<button
							type="button"
							class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[12px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
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
						<h3 class="truncate text-[11px] font-semibold">
							{{ activeDefinition?.name }}
						</h3>
					</div>
					<template
						v-if="!collapsedOutline.has('definition:' + activeDefinition?.id)"
					>
						<p
							v-if="activeDefinition?.sourceKey"
							class="zb-help !mb-2 !mt-1 px-0.5 text-[11px] leading-[1.65] text-zaux-dark-grey"
						>
							{{ translate("zx_builder_source_outline") }}
						</p>
						<BuilderTree
							v-else-if="activeDefinition"
							:nodes="activeDefinition.tree"
							instance="library"
							nested
						/> </template
				></template>
				<template v-else>
					<article
						v-for="instance in activeTemplate.instances"
						:key="instance.id"
						:data-zb-outline-instance="instance.id"
						data-zb-outline-drop="instance" :data-zb-drop-instance="instance.id"
						class="zb-instance relative rounded-xxs border-slim border-transparent px-0.5 pt-0.5 [&.active]:border-zaux-accent/60 [&.active]:pb-0.5"
						:class="{ active: outlineSelected(instance.id) }"
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
						<BuilderTree v-if="instance.kind === 'free'" :nodes="instance.definition.tree" :instance="instance.id" />
						<template v-else>
						<BuilderDropdown
							:context-menu="true"
							content-class="!w-max !max-w-max !pb-1"
							:label="translate('zx_builder_instance_actions') + ': ' + instance.name"
							:items="instanceContextItems(instance)"
							@contextmenu="selectOutlineRow(instance.id, null, false, true)"
							@select="instanceContextAction($event, instance)"
						>
						<template #trigger="{ open, menuId }">
						<div class="zb-instance-heading group/instance flex min-w-0 items-center gap-0.25 rounded-xxs hover:bg-zaux-light" :class="{ 'bg-zaux-accent/5': outlineSelected(instance.id) }">
							<button
								type="button"
								class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[12px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
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
								class="zb-instance-name select-none flex min-w-0 flex-1 items-center gap-1 truncate px-0.25 py-0.5 text-left !text-[11px] font-semibold"
								:class="{ 'text-zaux-accent': outlineSelected(instance.id) }"
								:aria-pressed="outlineSelected(instance.id)"
								aria-haspopup="menu"
								:aria-expanded="open"
								:aria-controls="menuId"
								@mousedown.shift.prevent
								@click="revealInstance(instance.id, $event)"
								@dblclick="modal = { type: 'rename', kind: 'instance', id: instance.id, name: instance.name }"
							>
								<span aria-hidden="true" class="text-[10px] text-zaux-accent">◆</span><span class="truncate">{{ instance.name }}</span>
							</button>
							<div
								class="zb-instance-tools flex shrink-0 items-center gap-[1px] opacity-0 group-hover/instance:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 [&>.zb-button]:!min-w-[24px] [&>.zb-button]:!w-[24px] [&>.zb-button]:!p-0.5"
								:class="{ '!opacity-100': instanceId === instance.id }"
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
							</template>
							</BuilderDropdown>
						<template v-if="!collapsedOutline.has('instance:' + instance.id)">
							<div v-if="instanceId === instance.id && instance.unmappedProperties?.length" class="py-0.5 pl-3">
								<details class="w-full mt-0 mb-0 text-[10px] !py-0.5">
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
								class="zb-source-outline px-1.5 py-0.5 pl-3 text-left text-[10px] text-zaux-accent"
								:aria-pressed="outlineSelected(instance.id)"
								@mousedown.shift.prevent
								@click="revealInstance(instance.id, $event)"
							>
								{{ translate("zx_builder_source_outline") }}</button
							><BuilderTree
								v-else
								:nodes="instance.definition.tree"
								:instance="instance.id"
								nested
							/>
						</template></template></article
					>
					<div class="relative mt-1 rounded-xxs border-slim border-dashed border-zaux-light-grey px-1 py-1 text-center text-[10px] text-zaux-dark-grey"
						data-zb-outline-drop="instance"
						@dragover="outlineDrag.over($event, null, null, true)"
						@dragleave="outlineDrag.leave"
						@drop="outlineDrag.drop($event, null, null, true)">
						{{ translate('zx_builder_free_elements_hint') }}
						<span v-if="outlineDrag.position(null, null, true)" class="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-zaux-accent" />
					</div>
				</template>
			</div>
		</section>

		<!-- Library: ZVC/ZVP assets. -->
		<section
			v-show="leftTab === 'library'"
			id="zb-left-panel-library"
			role="tabpanel"
			aria-labelledby="zb-left-tab-library"
			class="flex flex-col flex-1 min-h-0 zb-library-panel"
		>
			<div class="shrink-0 space-y-1 border-b-slim border-zaux-light-grey px-1.5 py-1.5">
				<div class="flex items-center gap-0.5">
					<BuilderInput
						v-model="librarySearch"
						class="flex-1"
						type="search"
						:label="translate('zx_builder_library_search')"
						:placeholder="translate('zx_builder_library_search')"
					/>
					<BuilderDropdown
						:label="translate('zx_builder_create')"
						icon="plus"
						iconOnly
						:extraTriggerProps="{ iconName: 'plus', hasIcon: true, actionIcon: false }"
						btnTheme="alt1"
						align="end"
						:items="createItems"
						:disabled="!canEditRemote"
						@select="modal = { type: $event.id }"
					/>
				</div>
				<div class="flex items-center gap-0.5">
					<div
						class="flex shrink-0 gap-[2px] rounded-xxs bg-zaux-light p-[2px]"
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
							class="rounded-xxs px-1 py-0.25 text-[10px] font-semibold"
							:class="
								libraryKind === kind
									? 'bg-zaux-white text-zaux-accent shadow-sm'
									: 'text-zaux-dark-grey hover:text-zaux-dark'
							"
							:title="translate('zx_builder_' + kind + '_pretty_name')"
							@click="libraryKind = kind"
							@keydown="libraryKindKeydown"
						>
							{{ kind.toUpperCase() }}
						</button>
					</div>
					<BuilderInput
						class="flex-1 !py-0.5 !text-[11px]"
						v-model="libraryCategory"
						type="select"
						:label="translate('zx_builder_library_category')"
						:options="[
							{ value: 'imported', label: translate('zx_builder_library_imported') },
							{ value: 'project', label: translate('zx_builder_library_project') },
						]"
					/>
				</div>
			</div>
			<div class="flex-1 min-h-0 px-1.5 py-1.5 overflow-auto zb-scroll">
				<p class="mb-1 text-[10px] text-zaux-dark-grey" role="status">
					{{ filteredLibrary.length }} {{ translate("zx_builder_" + libraryKind) }}
				</p>
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
					class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1"
					role="tabpanel"
					:id="'library-panel-' + libraryKind"
					:aria-labelledby="'library-kind-' + libraryKind"
					tabindex="0"
				>
					<article
						v-for="definition in filteredLibrary"
						:key="definition.id"
						class="zb-library-card group relative overflow-hidden rounded-xs border-slim border-zaux-light-grey transition-colors hover:border-zaux-accent [&.active]:border-zaux-accent"
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
						<BuilderButton
							:label="translate('zx_builder_add_to_template')"
							@click.stop="definition.kind === 'zvp' ? insertPartial(definition.id) : insertInstance(definition.id)"
							variant="light" size="xs" class="absolute z-30 !hidden -translate-x-1/2 group-hover:!block left-1/2 top-6"
						>
						</BuilderButton>
						<BuilderLibraryThumbnail
							:definition="definition"
							@insert="definition.kind === 'zvp' ? insertPartial(definition.id) : insertInstance(definition.id)"
							@choose-image="previewId = definition.id"
						/>
						<div class="zb-card-body relative px-1 pb-0.5 pt-0.5">
							<button
								class="zb-card-name block w-full truncate text-left text-[11px] font-semibold"
								:title="translate('zx_builder_edit_library') + ': ' + definition.name"
								@click="selectLibrary(definition.id)"
							>
								{{ definition.name }}
							</button>
							<small class="block truncate font-mono text-[9px] text-zaux-dark-grey">{{ definition.exportName }}</small>
							<div class="zb-card-actions -mx-0.5 flex items-center justify-between [&_.zb-button]:!w-[24px] [&_.zb-button]:!min-w-[24px] [&_.zb-button]:!p-0.5">
								<BuilderButton
									size="xs"
									variant="alt1"
									icon="enter"
									iconOnly
									:label="translate('zx_builder_edit_library') + ': ' + definition.name"
									@click="selectLibrary(definition.id)"
								/>
								<div class="flex items-center">
									<BuilderButton
										icon="duplicate"
										iconOnly
										size="xs"
										variant="alt1"
										:label="
											translate('zx_builder_duplicate') + ': ' + definition.name
										"
										:disabled="!canEditRemote"
										@click.stop="duplicate('library', definition.id)"
									/>
									<BuilderButton
										v-if="!definition.id.startsWith('source:')"
										icon="edit"
										iconOnly
										size="xs"
										variant="alt1"
										:label="`${translate('zx_builder_rename')}: ${definition.name}`"
										:disabled="!canEditRemote"
										@click="modal = { type: 'rename', kind: 'library', id: definition.id, name: definition.name }"
									/>
									<BuilderButton
										v-if="!definition.id.startsWith('source:')"
										icon="delete"
										iconOnly
										size="xs"
										variant="alt1"
										:label="`${translate('zx_builder_delete')}: ${definition.name}`"
										:disabled="!canEditRemote"
										@click="modal = { type: 'delete', kind: 'library', id: definition.id }"
									/>
								</div>
							</div>
						</div>
					</article>
				</div>
				<p
					class="zb-help !mb-2 !mt-1.5 text-[10px] leading-[1.65] text-zaux-dark-grey"
				>
					{{ translate("zx_builder_library_drag") }}
				</p>
			</div>
		</section>

		<!-- Elements: the curated palette. -->
		<section
			v-show="leftTab === 'elements'"
			id="zb-left-panel-elements"
			role="tabpanel"
			aria-labelledby="zb-left-tab-elements"
			class="flex flex-col flex-1 min-h-0 zb-elements-panel"
		>
			<div class="shrink-0 space-y-1 border-b-slim border-zaux-light-grey px-1.5 py-1.5">
				<BuilderInput
					v-model="search"
					type="search"
					:placeholder="translate('zx_builder_search')"
					:label="translate('zx_builder_search')"
				/>
				<BuilderInput v-if="mode === 'template'" v-model="elementDestination" type="select" class="!py-0.5 !text-[11px]"
					:label="translate('zx_builder_insert_destination')"
					:options="[{ value: 'template', label: translate('zx_builder_insert_template') }, { value: 'selection', label: translate('zx_builder_insert_selection') }]" />
			</div>
			<div class="flex-1 min-h-0 px-1.5 pb-2 overflow-auto zb-scroll" @scroll.passive="hideElementPreview">
				<div
					v-for="group in [
						'zx_builder_partials',
						'zx_builder_zaux',
						'zx_builder_native',
					]"
					v-show="filtered.some((item) => item.group === group)"
					:key="group"
				>
					<h3
						class="zb-eyebrow sticky top-0 z-10 bg-zaux-white pb-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey"
					>
						{{ translate(group) }}
					</h3>
					<!-- Zaux components and ZVPs: cards with an always-visible capture, as in the Library. -->
					<div
						v-if="group !== 'zx_builder_native'"
						class="zb-element-cards grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1"
					>
						<button
							v-for="entry in filtered.filter((item) => item.group === group)"
							:key="entry.name"
							type="button"
							class="flex min-w-0 cursor-grab flex-col overflow-hidden rounded-xs border-slim border-zaux-light-grey text-left transition-colors hover:border-zaux-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
							:draggable="canEditRemote"
							:title="translate('zx_builder_drag_hint')"
							@dragstart="hideElementPreview(); drag($event, { kind: 'catalog', name: entry.name })"
							@mouseenter="showElementPreview($event, entry)"
							@mouseleave="hideElementPreview"
							@focus="showElementPreview($event, entry)"
							@blur="hideElementPreview"
							@click="mode === 'template' && elementDestination === 'template' ? addTemplateElement(entry.name) : addElement(entry.name)"
						>
							<BuilderElementThumbnail v-if="elementPreviewId(entry)" :previewId="elementPreviewId(entry)" />
							<span class="flex min-w-0 items-center gap-0.5 px-0.5 py-0.25">
								<span class="shrink-0 text-[11px] text-zaux-accent" aria-hidden="true">{{ containers.includes(entry.name) ? "▤" : "◇" }}</span>
								<span class="truncate text-[11px]">{{ entry.name }}</span>
							</span>
						</button>
					</div>
					<div
						v-else
						class="zb-element-list flex flex-col gap-1.5 [&>button]:flex [&>button]:cursor-grab [&>button]:items-center [&>button]:gap-1 [&>button]:rounded-xxs [&>button]:px-0.5 [&>button]:py-0.25 [&>button]:text-left [&>button]:text-[11px] [&>button:hover]:bg-zaux-light"
					>
						<button
							v-for="entry in filtered.filter((item) => item.group === group)"
							:key="entry.name"
							:draggable="canEditRemote"
							:title="translate('zx_builder_drag_hint')"
							@dragstart="drag($event, { kind: 'catalog', name: entry.name })"
							@click="mode === 'template' && elementDestination === 'template' ? addTemplateElement(entry.name) : addElement(entry.name)"
						>
							<span
								class="zb-element-icon grid h-[22px] w-[22px] shrink-0 place-items-center rounded-xxs bg-zaux-light text-[14px] text-zaux-accent"
								>{{ containers.includes(entry.name) ? "▤" : "◇" }}</span
							><span class="truncate">{{ entry.name }}</span
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
				<p class="zb-help !mb-0 !mt-2 text-[10px] leading-[1.65] text-zaux-dark-grey">
					{{ translate("zx_builder_palette_hint") }} {{ translate("zx_builder_drag_hint") }}
				</p>
			</div>
		</section>
		<BuilderElementPreview
			v-if="elementPreview"
			:previewId="elementPreview.id"
			:name="elementPreview.name"
			:anchor="elementPreview.anchor"
		/>
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
import { defineComponent, computed, ref, watch, nextTick, onBeforeUnmount } from "vue";
import { useBuilder } from "../../composables/useBuilder.js";
import { catalog, containers } from "../../services/catalog.js";
import { createBuilderOutlineDrag } from "../../composables/useBuilderOutlineDrag.js";
import BuilderDropdown from "./BuilderDropdown.vue";
import BuilderElementPreview from "./BuilderElementPreview.vue";
import BuilderElementThumbnail from "./BuilderElementThumbnail.vue";
import BuilderLibraryThumbnail from "./BuilderLibraryThumbnail.vue";
import BuilderButton from "./BuilderButton.vue";
import BuilderCodeEditor from "./fields/BuilderCodeEditor.vue";
import BuilderTree from "./BuilderTree.vue";
import BuilderInput from "./fields/BuilderInput.vue";
import BuilderPages from "./BuilderPages.vue";

const TABS = [
	{ id: "layers", label: "zx_builder_outline" },
	{ id: "library", label: "zx_builder_library" },
	{ id: "elements", label: "zx_builder_elements" },
];

export default defineComponent({
	components: {
		BuilderLibraryThumbnail,
		BuilderDropdown,
		BuilderElementPreview,
		BuilderElementThumbnail,
		BuilderCodeEditor,
		BuilderButton,
		BuilderTree,
		BuilderInput,
		BuilderMediaPicker,
		BuilderPages,
	},
	props: { width: { default: 264 } },
	setup() {
		const builder = useBuilder();
		const outlineDrag = createBuilderOutlineDrag(builder);
		const search = ref("");
		const elementDestination = ref("template");
		const hintsOpen = ref(false);
		watch(() => builder.revealOutlineTarget.value, async (target) => {
			if (!target || builder.leftTab.value !== "layers") return;
			await nextTick();
			const selector = target.nodeId
				? `[data-zb-outline-node="${CSS.escape(target.nodeId)}"]`
				: builder.mode.value === "library"
					? "[data-zb-outline-definition]"
					: `[data-zb-outline-instance="${CSS.escape(target.instanceId)}"]`;
			document.querySelector(selector)?.scrollIntoView({ block: "center", behavior: "smooth" });
		});
		function tabKeydown(event) {
			if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
			event.preventDefault();
			const index = TABS.findIndex((tab) => tab.id === builder.leftTab.value);
			const next = event.key === "Home" ? 0
				: event.key === "End" ? TABS.length - 1
					: (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
			builder.leftTab.value = TABS[next].id;
			event.currentTarget.parentElement.querySelector("#zb-left-tab-" + TABS[next].id)?.focus();
		}
		// Spring-loaded tabs: hovering a tab while dragging a builder item opens it.
		let springTimer;
		function cancelSpring() { clearTimeout(springTimer); }
		function springTab(event, id) {
			cancelSpring();
			if (builder.leftTab.value === id || !event.dataTransfer?.types.includes("application/x-zaux-builder")) return;
			springTimer = setTimeout(() => { builder.leftTab.value = id; }, 450);
		}
		onBeforeUnmount(cancelSpring);
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
		// Zaux components and ZVPs show an inline capture plus a larger one beside the sidebar on hover/focus; HTML elements have none.
		const elementPreview = ref(null);
		function elementPreviewId(entry) {
			if (entry.group === "zx_builder_partials") return builder.document.value.library.find((item) => item.kind === "zvp" && item.exportName === entry.name)?.id ?? null;
			return entry.html ? null : "element:" + entry.name;
		}
		function showElementPreview(event, entry) {
			const id = elementPreviewId(entry);
			if (!id) { elementPreview.value = null; return; }
			const row = event.currentTarget.getBoundingClientRect();
			const sidebar = event.currentTarget.closest(".zb-sidebar").getBoundingClientRect();
			elementPreview.value = { id, name: entry.name, anchor: { top: row.top, bottom: row.bottom, left: sidebar.right } };
		}
		function hideElementPreview() { elementPreview.value = null; }
		watch(() => builder.leftTab.value, hideElementPreview);

		function revealInstance(id, event) {
			builder.selectOutlineRow(id, null, event.shiftKey);
			if (!event.shiftKey) builder.reveal(id);
		}

		// Right-click menu on a ZVC instance name in the outline.
		function instanceContextItems(instance) {
			const original = builder.document.value.library.some((item) => item.id === instance.sourceId);
			const editable = builder.canEditRemote.value;
			return [
				{ id: "edit-library", icon: "enter", label: builder.translate("zx_builder_edit_library"), disabled: !original },
				{ id: "rename", icon: "edit", label: builder.translate("zx_builder_rename"), disabled: !editable },
				{ id: "export", icon: "download", label: builder.translate("zx_builder_export_instance") },
				{ id: "sync", icon: "refresh", label: builder.translate("zx_builder_restore_library"), disabled: !editable || !original },
				{ id: "reset", icon: "loop", label: builder.translate("zx_builder_reset_instance"), disabled: !editable || !original, danger: true },
			];
		}
		function instanceContextAction(item, instance) {
			if (item.id === "rename") builder.modal.value = { type: "rename", kind: "instance", id: instance.id, name: instance.name };
			else if (item.id === "sync") builder.restoreActiveInstance();
			else if (item.id === "reset") builder.resetInstance(instance.id);
			else if (item.id === "edit-library") builder.selectLibrary(instance.sourceId);
			else if (item.id === "export") {
				// The export dialog reads the component scope from the selected instance.
				if (builder.instanceId.value !== instance.id) builder.selectOutlineRow(instance.id, null, false, true);
				builder.openExport({ scope: "component" });
			}
		}

		return {
			...builder,
			tabs: TABS,
			tabKeydown,
			springTab,
			cancelSpring,
			createItems,
			libraryKindKeydown,
			elementDestination,
			search,
			filtered,
			filteredLibrary,
			containers,
			drag,
			outlineDrag,
			previewId,
			setPreview,
			revealInstance,
			instanceContextItems,
			instanceContextAction,
			hintsOpen,
			elementPreview,
			elementPreviewId,
			showElementPreview,
			hideElementPreview,
		};
	},
});
</script>
