<template>
	<div
		v-if="failed"
		class="zb-preview-failure bg-utility-error/10 p-4 font-builder text-[14px] text-utility-error"
		role="alert"
	>
		{{ message }}
	</div>
	<slot v-else />
</template>
<script>
import { defineComponent, onErrorCaptured, ref } from "vue";
export default defineComponent({
	props: { message: String },
	emits: ['error'],
	setup(props, { emit }) {
		const failed = ref(false);
		onErrorCaptured((error) => {
			failed.value = true;
			emit('error', error?.message || 'Component render failed');
			return false;
		});
		return { failed };
	},
});
</script>
