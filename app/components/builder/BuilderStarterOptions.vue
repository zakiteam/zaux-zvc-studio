<template>
	<section
		class="zb-starter-options rounded-xxs border-slim border-zaux-light-grey bg-zaux-white"
		:aria-label="translate('zx_builder_starter_contents')"
	>
		<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-1.5 py-1">
			<button
				type="button"
				class="flex min-w-0 items-center gap-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zaux-dark-grey hover:text-zaux-dark"
				:aria-expanded="open"
				:aria-controls="bodyId"
				@click="open = !open"
			>
				<svg class="h-[10px] w-[10px] shrink-0 transition-transform" :class="open ? '' : '-rotate-90'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'dropdown-bottom')" /></svg>
				<span class="truncate">{{ translate("zx_builder_starter_contents") }}</span>
			</button>
			<!-- Compact recap, still readable while the selection is collapsed. -->
			<ul class="flex flex-wrap gap-0.5">
				<li
					v-for="group in groups"
					:key="group.id"
					class="rounded-full px-0.75 text-[9px] font-semibold"
					:class="group.selected ? 'bg-zaux-accent/15 text-zaux-accent' : 'bg-zaux-light text-zaux-dark-grey'"
				>{{ translate(group.title) }} {{ group.selected }}/{{ group.total }}</li>
				<li
					v-if="variant !== 'php'"
					class="rounded-full px-0.75 text-[9px] font-semibold"
					:class="modelValue.studio === true ? 'bg-zaux-accent/15 text-zaux-accent' : 'bg-zaux-light text-zaux-dark-grey'"
				>{{ translate("zx_builder_starter_section_studio") }} {{ modelValue.studio === true ? "✓" : "–" }}</li>
			</ul>
			<input
				v-show="open"
				v-model="query"
				type="search"
				class="ml-auto w-[240px] max-w-full px-2 py-1 border-none bg-zaux-light text-[11px]"
				:placeholder="translate('zx_builder_starter_filter')"
				:aria-label="translate('zx_builder_starter_filter')"
			/>
			<p class="text-[11px] text-zaux-dark-grey" :class="open ? '' : 'ml-auto'" role="status">
				{{ translate("zx_builder_starter_summary", { count: fileCount, size: fileSize }) }}
			</p>
		</div>
		<div
			v-show="open"
			:id="bodyId"
			class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-1.5 border-t-slim border-zaux-light-grey p-1.5"
		>
			<div
				v-for="group in groups"
				:key="group.id"
				class="flex min-w-0 flex-col rounded-xxs border-slim border-zaux-light-grey bg-zaux-light/40"
			>
				<div class="flex items-center gap-1 border-b-slim border-zaux-light-grey px-1 py-0.75">
					<h3 class="m-0 flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zaux-dark-grey">
						<span class="truncate">{{ translate(group.title) }}</span>
						<span
							class="shrink-0 rounded-full px-0.75 text-[9px] normal-case tracking-normal"
							:class="group.selected ? 'bg-zaux-accent/15 text-zaux-accent' : 'bg-zaux-white text-zaux-dark-grey'"
						>{{ group.selected }}/{{ group.total }}</span>
					</h3>
					<div v-if="group.items && group.total" class="flex shrink-0 gap-0.5 [&>button]:rounded-xxs [&>button]:px-0.75 [&>button]:py-0.25 [&>button]:text-[10px] [&>button]:text-zaux-dark-grey hover:[&>button]:bg-zaux-accent/10 hover:[&>button]:text-zaux-dark">
						<button type="button" @click="setAll(group, true)">{{ translate("zx_builder_starter_select_all") }}</button>
						<button v-if="group.hasImported" type="button" :title="translate('zx_builder_starter_select_project')" @click="selectProjectOnly(group)">{{ translate("zx_builder_starter_select_project") }}</button>
						<button type="button" @click="setAll(group, false)">{{ translate("zx_builder_starter_select_none") }}</button>
					</div>
				</div>
				<div class="max-h-[196px] min-h-0 overflow-auto p-0.5">
					<template v-if="group.items">
						<ul v-if="group.visible.length" class="flex flex-col">
							<li v-for="item in group.visible" :key="item.id">
								<label class="flex cursor-pointer items-center gap-1.5 rounded-xxs px-0.5 py-0.5 text-[12px] text-zaux-dark hover:bg-zaux-white">
									<input
										type="checkbox"
										class="!w-auto shrink-0 accent-zaux-accent"
										:checked="item.checked"
										@change="setItem(group, item.id, $event.target.checked)"
									/>
									<span class="min-w-0 flex-1">
										<span class="block truncate" :class="item.checked ? '' : 'text-zaux-dark-grey'">{{ item.label }}</span>
										<span v-if="item.detail" class="block truncate font-mono text-[9px] text-zaux-dark-grey">{{ item.detail }}</span>
									</span>
									<span
										v-if="item.imported"
										class="shrink-0 rounded-full bg-zaux-white px-0.75 text-[9px] text-zaux-dark-grey"
									>{{ translate("zx_builder_starter_badge_imported") }}</span>
									<span
										v-if="!item.checked && item.viaTemplate"
										class="shrink-0 rounded-full bg-zaux-accent/15 px-0.75 text-[9px] text-zaux-accent"
										:title="translate('zx_builder_starter_template_hint')"
									>{{ translate("zx_builder_starter_badge_template") }}</span>
								</label>
							</li>
						</ul>
						<p v-else class="px-0.5 py-1 text-[11px] text-zaux-dark-grey">
							{{ translate(group.total ? "zx_builder_starter_no_results" : "zx_builder_starter_empty_list") }}
						</p>
					</template>
					<ul v-else class="flex flex-col">
						<li v-for="item in group.options" :key="item.key">
							<label
								class="flex items-center gap-1.5 rounded-xxs px-0.5 py-0.5 text-[12px] text-zaux-dark"
								:class="item.available ? 'cursor-pointer hover:bg-zaux-white' : 'cursor-not-allowed opacity-60'"
								:title="item.available ? item.path : translate('zx_builder_starter_style_unavailable')"
							>
								<input
									type="checkbox"
									class="!w-auto shrink-0 accent-zaux-accent"
									:checked="item.available && optionChecked(item)"
									:disabled="!item.available"
									@change="update({ [item.key]: $event.target.checked })"
								/>
								<span class="min-w-0 flex-1">
									<span class="block truncate">{{ translate(item.label) }}</span>
									<span class="block truncate font-mono text-[9px] text-zaux-dark-grey">{{ item.available ? item.path : translate("zx_builder_starter_style_unavailable") }}</span>
								</span>
							</label>
						</li>
					</ul>
				</div>
				<p v-if="group.hint" class="border-t-slim border-zaux-light-grey px-1 py-0.75 text-[10px] leading-[1.55] text-zaux-dark-grey">{{ translate(group.hint) }}</p>
			</div>
			<div v-if="variant !== 'php'" class="flex min-w-0 flex-col rounded-xxs border-slim border-zaux-light-grey bg-zaux-light/40">
				<h3 class="m-0 border-b-slim border-zaux-light-grey px-1 py-0.75 text-[10px] font-semibold uppercase tracking-wider text-zaux-dark-grey">
					{{ translate("zx_builder_starter_section_studio") }}
				</h3>
				<label class="flex cursor-pointer items-start gap-1.5 p-1 text-[12px] text-zaux-dark">
					<input
						type="checkbox"
						class="mt-0.25 !w-auto shrink-0 accent-zaux-accent"
						:checked="modelValue.studio === true"
						@change="update({ studio: $event.target.checked })"
					/>
					<span class="min-w-0 flex-1">
						<span class="block">{{ translate("zx_builder_starter_studio_include") }}</span>
						<span class="mt-0.25 block text-[10px] leading-[1.55] text-zaux-dark-grey">{{ translate("zx_builder_starter_studio_hint") }}</span>
					</span>
				</label>
			</div>
		</div>
	</section>
</template>

<script>
	import { computed, defineComponent, ref, useId } from "vue";
	import { useBuilder } from "../../composables/useBuilder.js";
	import { iconHref } from "@integration/options/icon-options.js";

	const STYLE_OPTIONS = [
		{ key: "tokens", label: "zx_builder_starter_style_tokens", path: "style/tokens/*.json" },
		{ key: "variables", label: "zx_builder_starter_style_variables", path: "style/studio-tokens.css" },
		{ key: "componentThemes", label: "zx_builder_starter_style_component_themes", path: "style/component-themes.css" },
		{ key: "projectStyles", label: "zx_builder_starter_style_project_styles", path: "style/project-styles.css" },
		{ key: "uiConfig", label: "zx_builder_starter_style_ui_config", path: "style/ui.config.js" },
		{ key: "fonts", label: "zx_builder_starter_style_fonts", path: "fonts.html, fonts.json" },
	];
	// PHP package: support files are opt-in (unchecked unless set to true).
	const PHP_OPTIONS = [
		{ key: "phpHelpers", label: "zx_builder_php_include_helpers", path: "zvc-helper.php", optIn: true },
		{ key: "phpReadme", label: "zx_builder_php_include_readme", path: "README.md", optIn: true },
	];

	// Content selection for the "Zaux starter package" export, shown above the
	// file explorer as a wrapping grid of cards. The selection is plain JSON:
	// excluded library/template ids plus style and Studio switches.
	export default defineComponent({
		name: "BuilderStarterOptions",
		props: {
			workspace: { type: Object, required: true },
			modelValue: { type: Object, required: true },
			availability: { type: Object, default: () => ({}) },
			files: { type: Object, default: () => ({}) },
			// "js": Zaux starter package; "php": PHP package (no styles or Studio part).
			variant: { type: String, default: "js" },
		},
		emits: ["update:modelValue"],
		setup(props, { emit }) {
			const { translate, iconSet } = useBuilder();
			const query = ref("");
			const open = ref(true);
			const bodyId = useId();
			function update(patch) {
				emit("update:modelValue", { ...props.modelValue, ...patch });
			}
			const excludedDefinitions = computed(() => new Set(props.modelValue.excludedDefinitions ?? []));
			const excludedTemplates = computed(() => new Set(props.modelValue.excludedTemplates ?? []));
			// Library entries used by an included template are exported anyway as
			// that template's independent dependencies.
			const templateSources = computed(() => new Set(props.workspace.templates
				.filter((template) => !excludedTemplates.value.has(template.id))
				.flatMap((template) => template.instances.filter((instance) => instance.kind !== "free").map((instance) => instance.sourceId))));
			function matches(item) {
				const text = query.value.trim().toLowerCase();
				return !text || `${item.label} ${item.detail}`.toLowerCase().includes(text);
			}
			function listGroup(id, title, entries, excluded, key) {
				const items = entries.map((entry) => ({
					id: entry.id,
					label: entry.name || entry.exportName,
					detail: entry.exportName ?? "",
					imported: Boolean(entry.sourceKey),
					viaTemplate: key === "excludedDefinitions" && templateSources.value.has(entry.id),
					checked: !excluded.has(entry.id),
				}));
				return {
					id, title, key, items,
					visible: items.filter(matches),
					total: items.length,
					selected: items.filter((item) => item.checked).length,
					hasImported: items.some((item) => item.imported) && items.some((item) => !item.imported),
					hint: key === "excludedDefinitions" && items.some((item) => !item.checked && item.viaTemplate) ? "zx_builder_starter_template_hint" : "",
				};
			}
			const groups = computed(() => {
				const library = props.workspace.library;
				const php = props.variant === "php";
				const options = php
					? PHP_OPTIONS.map((option) => ({ ...option, available: true }))
					: STYLE_OPTIONS.map((option) => ({ ...option, available: props.availability[option.key] !== false }));
				return [
					listGroup("zvc", "zx_builder_starter_section_zvc", library.filter((definition) => definition.kind !== "zvp"), excludedDefinitions.value, "excludedDefinitions"),
					listGroup("zvp", "zx_builder_starter_section_zvp", library.filter((definition) => definition.kind === "zvp"), excludedDefinitions.value, "excludedDefinitions"),
					listGroup("templates", "zx_builder_starter_section_templates", props.workspace.templates.map((template) => ({ id: template.id, name: template.name })), excludedTemplates.value, "excludedTemplates"),
					{
						id: php ? "php" : "styles", title: php ? "zx_builder_php_section_files" : "zx_builder_starter_section_styles", options,
						total: options.filter((option) => option.available).length,
						selected: options.filter((option) => option.available && optionChecked(option)).length,
					},
				];
			});
			function optionChecked(option) {
				return option.optIn ? props.modelValue[option.key] === true : props.modelValue[option.key] !== false;
			}
			function setIds(group, ids, include) {
				const excluded = new Set(props.modelValue[group.key] ?? []);
				ids.forEach((id) => (include ? excluded.delete(id) : excluded.add(id)));
				update({ [group.key]: [...excluded] });
			}
			function setItem(group, id, include) {
				setIds(group, [id], include);
			}
			// Bulk actions follow the filter, so a search narrows what they change.
			function setAll(group, include) {
				setIds(group, group.visible.map((item) => item.id), include);
			}
			function selectProjectOnly(group) {
				const excluded = new Set(props.modelValue[group.key] ?? []);
				group.visible.forEach((item) => (item.imported ? excluded.add(item.id) : excluded.delete(item.id)));
				update({ [group.key]: [...excluded] });
			}
			const fileCount = computed(() => Object.keys(props.files).length);
			const fileSize = computed(() => {
				const bytes = Object.values(props.files).reduce((total, content) => total + new Blob([content]).size, 0);
				return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
			});
			return {
				translate, iconSet, iconHref, query, open, bodyId, groups, update, setItem, setAll, selectProjectOnly, optionChecked,
				fileCount, fileSize,
			};
		},
	});
</script>
