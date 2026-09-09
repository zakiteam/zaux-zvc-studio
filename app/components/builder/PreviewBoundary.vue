<template><div v-if="failed" class="zb-preview-failure bg-utility-error/10 p-4 font-builder text-[14px] text-utility-error" role="alert">{{ message }}</div><slot v-else /></template>
<script>
import { defineComponent, onErrorCaptured, ref } from 'vue';
export default defineComponent({ props: { message: String }, setup() { const failed = ref(false); onErrorCaptured(() => { failed.value = true; return false; }); return { failed }; } });
</script>
