<template>
	<div class="grid gap-1.5">
		<p class="text-[10px] leading-[1.5] text-zaux-dark-grey">
			{{ translate(config.mode === "flat" ? "zx_builder_attributes_flat_hint" : "zx_builder_attributes_hint") }}
		</p>
		<BuilderAttributeFields
			v-if="config.mode === 'flat'"
			:modelValue="attributes"
			:suggestions="config.suggestions"
			:label="translate('zx_builder_attributes')"
			@update:modelValue="commit"
		/>
		<template v-else>
			<div
				v-for="hook in activeHooks"
				:key="hook.key"
				class="overflow-hidden rounded-xs border-slim"
				:class="expanded.has(hook.key) ? 'border-zaux-accent/40' : 'border-zaux-light-grey'"
			>
				<div class="flex items-center gap-1 pr-0.5" :class="expanded.has(hook.key) ? 'bg-zaux-accent/5' : ''">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1 text-left"
						:aria-expanded="expanded.has(hook.key)"
						@click="toggle(hook.key)"
					>
						<svg class="h-[10px] w-[10px] shrink-0 text-zaux-dark-grey transition-transform" :class="expanded.has(hook.key) ? '' : '-rotate-90'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'dropdown-bottom')" /></svg>
						<span class="min-w-0 flex-1">
							<span class="flex min-w-0 items-center gap-1">
								<span class="truncate text-[11px] font-medium">{{ hookLabel(hook.key) }}</span>
								<span v-if="hook.count" class="shrink-0 rounded-full bg-zaux-accent/15 px-0.75 text-[9px] font-semibold text-zaux-accent">{{ hook.count }}</span>
							</span>
							<span class="flex min-w-0 items-center gap-1 text-[9px] text-zaux-dark-grey">
								<code class="font-mono">{{ hook.key }}</code>
								<span v-if="hook.source">· {{ translate("zx_builder_attributes_via", { name: hook.source }) }}</span>
								<span v-if="hook.unknown" class="text-utility-warning">· {{ translate("zx_builder_attributes_unknown_hook") }}</span>
								<span v-if="!expanded.has(hook.key) && hook.summary" class="min-w-0 truncate font-mono">· {{ hook.summary }}</span>
							</span>
						</span>
					</button>
					<BuilderButton
						variant="light"
						size="xs"
						icon="delete"
						iconOnly
						:label="translate('zx_builder_attributes_remove_hook', { name: hook.key })"
						@click="removeHook(hook.key)"
					/>
				</div>
				<div v-if="expanded.has(hook.key)" class="border-t-slim border-zaux-light-grey p-1.5">
					<BuilderAttributeFields
						v-if="hook.editable"
						:modelValue="hook.value"
						:suggestions="config.suggestions"
						:label="hook.key"
						@update:modelValue="setHook(hook.key, $event)"
					/>
					<BuilderValue
						v-else
						type="json"
						:modelValue="hook.value"
						:label="hook.key"
						@update:modelValue="setHookJson(hook.key, $event)"
					/>
				</div>
			</div>
			<p v-if="!activeHooks.length" class="rounded-xs border-slim border-dashed border-zaux-light-grey px-1.5 py-1.5 text-[10px] text-zaux-dark-grey">
				{{ translate("zx_builder_attributes_empty") }}
			</p>
			<div v-if="customHook !== null" class="flex items-center gap-1">
				<input
					ref="customInput"
					v-model="customHook"
					type="text"
					class="flex-1 px-1.5 py-0.75 font-mono text-[11px] bg-zaux-light border-none"
					:placeholder="translate('zx_builder_attributes_custom_placeholder')"
					:aria-label="translate('zx_builder_attributes_custom')"
					spellcheck="false"
					autocomplete="off"
					@keydown.enter.prevent="addCustomHook"
					@keydown.esc.prevent="customHook = null"
				/>
				<BuilderButton size="xs" icon="add" iconOnly :label="translate('zx_builder_add')" :disabled="!customHook.trim()" @click="addCustomHook" />
				<BuilderButton size="xs" variant="light" icon="close" iconOnly :label="translate('zx_builder_cancel')" @click="customHook = null" />
			</div>
			<BuilderDropdown
				class="w-full"
				:label="translate('zx_builder_attributes_add_hook')"
				:items="hookItems"
				:filterItems="hookItems.length > 8"
				@select="addHook"
			>
				<template #trigger="{ open, menuId }">
					<button
						type="button"
						class="flex w-full items-center justify-center gap-1 rounded-xxs border-slim border-dashed border-zaux-light-grey px-1.5 py-1 text-[11px] text-zaux-dark-grey hover:border-zaux-accent hover:text-zaux-accent"
						:aria-expanded="open"
						aria-haspopup="menu"
						:aria-controls="menuId"
					>
						<svg class="h-[12px] w-[12px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, 'plus')" /></svg>
						{{ translate("zx_builder_attributes_add_hook") }}
					</button>
				</template>
			</BuilderDropdown>
		</template>
	</div>
</template>
<script>
	import { computed, defineComponent, nextTick, ref } from "vue";
	import { useBuilder } from "../../../../composables/useBuilder.js";
	import { iconHref } from "@integration/options/icon-options.js";
	import { hookLabel } from "../../../../../integrations/zaux/controls/hook-registry.js";
	import { isPlainRecord } from "../../../../../domain/slider.js";
	import { setAttributeHook } from "../../../../../domain/attributes.js";

	const summaryOf = (value) => isPlainRecord(value)
		? Object.entries(value).map(([key, item]) => `${key}${typeof item === "string" && item ? "=" + item : ""}`).join(" ")
		: JSON.stringify(value);

	// Edits a Zaux `attributes` prop: per inner-node hooks from the generated
	// registry (class, id, data-*, aria-* on each hook) or, for components that bind
	// it on one element, a flat attribute list. Bindings never reach this editor.
	export default defineComponent({
		name: "BuilderAttributes",
		props: {
			node: { type: Object, required: true },
			config: { type: Object, required: true },
		},
		setup(props) {
			const builder = useBuilder();
			const customInput = ref(null);
			const customHook = ref(null);
			// Hooks opened in this session but still without attributes are not written yet.
			const pending = ref([]);
			const expanded = ref(new Set());
			const attributes = computed(() => (isPlainRecord(props.node.props.attributes) ? props.node.props.attributes : {}));
			const knownHooks = computed(() => props.config.hooks ?? []);
			const activeHooks = computed(() => {
				const keys = [
					...knownHooks.value.map((hook) => hook.key).filter((key) => Object.hasOwn(attributes.value, key)),
					...Object.keys(attributes.value).filter((key) => !knownHooks.value.some((hook) => hook.key === key)),
					...pending.value.filter((key) => !Object.hasOwn(attributes.value, key)),
				];
				return keys.map((key) => {
					const known = knownHooks.value.find((hook) => hook.key === key);
					const value = Object.hasOwn(attributes.value, key) ? attributes.value[key] : {};
					return {
						key,
						value,
						source: known?.source ?? null,
						unknown: !known,
						editable: value == null || isPlainRecord(value),
						count: isPlainRecord(value) ? Object.keys(value).length : 0,
						summary: summaryOf(value),
					};
				});
			});
			const hookItems = computed(() => {
				const free = knownHooks.value.filter((hook) => !activeHooks.value.some((item) => item.key === hook.key));
				const sources = [...new Set(free.map((hook) => hook.source))];
				return [
					...sources.flatMap((source) => [
						...(sources.length > 1 ? [{ id: "heading-" + (source ?? "own"), heading: source ?? props.node.name }] : []),
						...free.filter((hook) => hook.source === source).map((hook) => ({ id: hook.key, label: `${hookLabel(hook.key)} · ${hook.key}` })),
					]),
					...(free.length ? [{ id: "__separator", separator: true }] : []),
					{ id: "__custom", label: builder.translate("zx_builder_attributes_custom") },
				];
			});
			function commit(value) {
				builder.updateNode({ ...props.node.props, attributes: value });
			}
			function toggle(key) {
				const next = new Set(expanded.value);
				if (next.has(key)) next.delete(key);
				else next.add(key);
				expanded.value = next;
			}
			function open(key) {
				if (!activeHooks.value.some((hook) => hook.key === key)) pending.value = [...pending.value, key];
				expanded.value = new Set([...expanded.value, key]);
			}
			async function addHook(item) {
				if (item.id === "__custom") {
					customHook.value = "";
					await nextTick();
					customInput.value?.focus();
					return;
				}
				open(item.id);
			}
			function addCustomHook() {
				const key = customHook.value?.trim();
				if (!key) return;
				open(key);
				customHook.value = null;
			}
			function setHook(key, value) {
				pending.value = pending.value.filter((item) => item !== key);
				if (!Object.keys(value).length) pending.value = [...pending.value, key];
				commit(setAttributeHook(attributes.value, key, value));
			}
			// Non-object hook values (imported JSON) keep a JSON editor and are stored verbatim.
			function setHookJson(key, value) {
				commit({ ...attributes.value, [key]: value });
			}
			function removeHook(key) {
				pending.value = pending.value.filter((item) => item !== key);
				if (!Object.hasOwn(attributes.value, key)) return;
				const { [key]: _removed, ...rest } = attributes.value;
				commit(rest);
			}
			return {
				...builder, iconHref, hookLabel, customInput, customHook, expanded, attributes, activeHooks, hookItems,
				commit, toggle, addHook, addCustomHook, setHook, setHookJson, removeHook,
			};
		},
	});
</script>
