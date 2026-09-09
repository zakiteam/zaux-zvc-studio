<template>
	<ZButton
		class="zb-button !h-auto !min-h-[30px] !rounded-xxs !border-slim !border-transparent !bg-transparent !px-1.5 !py-1 !font-builder !text-[11px] !font-medium !normal-case !leading-[1.2] !text-zaux-dark !shadow-none whitespace-nowrap hover:!bg-zaux-light [&_*]:!text-[inherit] [&_*]:!leading-[inherit] [&_i]:h-[15px] [&_i]:w-[15px] [&_svg]:h-full [&_svg]:w-full [&_svg]:!fill-current [&_svg]:shrink-0 [&.zb-button--primary]:!bg-zaux-accent [&.zb-button--primary]:!px-2 [&.zb-button--primary]:!py-1.5 [&.zb-button--primary]:!text-zaux-white [&.zb-button--primary:hover]:!bg-zaux-dark-accent"
		tag="button"
		type="button"
		size="s"
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
		variant: { default: "secondary" },
	},
	setup(props) {
		return {
			resolvedIcon: computed(() => iconAliases[props.icon] ?? props.icon),
		};
	},
});
</script>
