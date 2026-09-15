<template>
	<select
		class="px-2 py-1 border-none"
        :class="highlightWhenSet && modelValue !== '' && modelValue != null ? 'bg-zaux-light-accent/50 outline outline-1 outline-zaux-accent' : 'bg-zaux-light'"
		v-if="type === 'select'"
		:id="id"
		:value="modelValue"
		:aria-label="label"
		:disabled="disabled"
		@change="onSelect"
	>
		<option
			v-for="option in options"
			:key="option.value ?? option"
			:value="option.value ?? option"
		>
			{{ option.label ?? option }}
		</option>
	</select>
	<input
		class="px-2 py-1 border-none"
        :class="highlightWhenSet && modelValue !== '' && modelValue != null ? 'bg-zaux-light-accent/50 outline outline-1 outline-zaux-accent' : 'bg-zaux-light'"
		v-else
		:id="id"
		:value="modelValue ?? ''"
		:type="type"
		:placeholder="placeholder"
		:aria-label="label"
		:disabled="disabled"
		:readonly="readonly"
		:required="required"
		:maxlength="maxlength"
		:autocomplete="autocomplete"
		@input="onInput"
		@change="$emit('change', $event)"
	/>
</template>

<script>

	import { defineComponent } from "vue";
	export default defineComponent({
		props: {
			modelValue: { default: "" },
			type: { default: "text" },
			id: String,
			label: String,
			placeholder: String,
			options: { default: () => [] },
			highlightWhenSet: Boolean,
			disabled: Boolean,
			readonly: Boolean,
			required: Boolean,
			maxlength: [String, Number],
			autocomplete: String,
		},
		emits: ["update:modelValue", "change", "input"],
		setup(props, { emit }) {
			function onInput(event) {
				emit("update:modelValue", event.target.value);
				emit("input", event);
			}
			function onSelect(event) {
				const option = props.options[event.target.selectedIndex];
				emit(
					"update:modelValue",
					option && typeof option === "object" ? option.value : option,
				);
				emit("change", event);
			}
			return { onInput, onSelect };
		},
	});
	
</script>
