<template>
	<BuilderDropdown
		class="zb-icon-picker w-full min-w-0"
		:label="label || translate('zx_builder_icon_picker')"
		:items="items"
		:disabled="disabled"
		filterItems
		@select="pick"
	>
		<template #trigger="{ open, menuId }">
			<button
				type="button"
				class="flex w-full min-w-0 items-center gap-1 rounded-xxs bg-zaux-light px-1 py-0.5 text-left text-[11px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent disabled:cursor-not-allowed disabled:opacity-50"
				:disabled="disabled"
				:title="currentLabel"
				:aria-label="`${label || translate('zx_builder_icon_picker')}: ${currentLabel}`"
				:aria-expanded="open"
				aria-haspopup="menu"
				:aria-controls="menuId"
			>
				<span class="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-xxs border-slim border-zaux-light-grey bg-zaux-white" aria-hidden="true">
					<svg v-if="modelValue" class="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="currentColor" focusable="false"><use :href="href(modelValue)" /></svg>
				</span>
				<span class="min-w-0 flex-1 truncate" :class="{ 'text-zaux-dark-grey': !modelValue }">{{ currentLabel }}</span>
				<span v-if="modelValue && !known" class="shrink-0 rounded-full bg-utility-warning/20 px-1 text-[9px] font-semibold">{{ translate('zx_builder_icon_not_in_set') }}</span>
				<svg class="h-[12px] w-[12px] shrink-0 transition-transform" :class="{ 'rotate-180': open }" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="href('dropdown-bottom')" /></svg>
			</button>
		</template>
		<template #header>
			<p class="text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_icon_picker_set', { set: iconSet, count: items.filter(item => item.value).length }) }}</p>
		</template>
	</BuilderDropdown>
</template>
<script>
import { defineComponent, computed } from "vue";
import { useBuilder } from "../../../composables/useBuilder.js";
import { useTranslation } from "../../../composables/useTranslation.js";
import { iconSets, iconHref, resolveIconSet } from "@integration/options/icon-options.js";

// Searchable icon dropdown: each option previews the symbol in the active Zaux icon set.
// `icons` restricts the names (an empty string becomes the "none" option); without it every
// symbol of the active set is listed and `allowEmpty` adds the "none" option.
export default defineComponent({
	props: {
		modelValue: { default: "" },
		label: String,
		icons: { type: Array, default: null },
		allowEmpty: Boolean,
		emptyLabel: String,
		disabled: Boolean,
	},
	emits: ["update:modelValue"],
	setup(props, { emit }) {
		const { translate } = useTranslation();
		const builder = useBuilder();
		const iconSet = computed(() => builder?.iconSet?.value ?? resolveIconSet());
		const names = computed(() => props.icons ?? [...(props.allowEmpty ? [""] : []), ...(iconSets[iconSet.value] ?? [])]);
		const noneLabel = computed(() => props.emptyLabel || translate("zx_builder_cta_none"));
		const known = computed(() => names.value.includes(props.modelValue));
		const currentLabel = computed(() => props.modelValue ? String(props.modelValue) : noneLabel.value);
		const href = name => iconHref(iconSet.value, name);
		const items = computed(() => names.value.map(name => ({
			id: name || "__none",
			value: name,
			label: name || noneLabel.value,
			iconHref: name ? href(name) : undefined,
			active: Object.is(name, props.modelValue ?? ""),
		})));
		function pick(item) {
			if (!Object.is(item.value, props.modelValue)) emit("update:modelValue", item.value);
		}
		return { translate, iconSet, items, known, currentLabel, href, pick };
	},
});
</script>
