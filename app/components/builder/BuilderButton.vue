<template>
	<ZButton
		class="zb-button !h-auto !rounded-xxs !font-builder"
		tag="button"
		type="button"
		:size="size"
		:theme="variant"
		:label="label"
		:hasIcon="!!icon"
		:iconName="resolvedIcon"
		:iconOnly="iconOnly"
		:actionIconFlip="false"
		:title="title || label"
		:aria-label="title || label"
		:class="['zb-button', `zb-button--${variant}`]"
    	v-bind="extraProps"
	>
		<template v-if="swatch" #preLabel>
			<span
				aria-hidden="true"
				class="relative mr-1 inline-block h-[16px] w-[16px] shrink-0 self-center overflow-hidden rounded-xxs border-slim border-zaux-light-grey"
				style="background: repeating-conic-gradient(#c4c4c4 0% 25%, #fff 0% 50%) 0 / 8px 8px"
			>
				<span class="absolute inset-0 zb-project-swatch" :style="{ backgroundColor: swatch }" />
			</span>
		</template>
	</ZButton>
</template>
<script>
import { defineComponent, computed } from "vue";
import { iconAliases } from "../../data/icons.js";
export default defineComponent({
	name: "BuilderButton",
	props: {
		label: String,
		swatch: String,
		title: String,
		icon: String,
		iconOnly: Boolean,
    	extraProps : { default : null },
		size : { default : 's' },
		variant: { default: "secondary" },
	},
	setup(props) {
		return {
			resolvedIcon: computed(() => iconAliases[props.icon] ?? props.icon),
		};
	},
});
</script>
