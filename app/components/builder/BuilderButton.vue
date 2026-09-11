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
		:title="title || label"
		:aria-label="title || label"
		:class="['zb-button', `zb-button--${variant}`]"
    	v-bind="extraProps"
	/>
</template>
<script>
import { defineComponent, computed } from "vue";
import { iconAliases } from "../../data/icons.js";
export default defineComponent({
	name: "BuilderButton",
	props: {
		label: String,
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
