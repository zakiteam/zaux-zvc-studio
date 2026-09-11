<template>
	<div
		v-if="!ready"
		class="grid  place-items-center bg-zaux-light h-screen font-builder text-[12px] text-zaux-dark-grey"
	>
		{{ translate("zx_builder_loading") }}
	</div>
	<BuilderWorkspace v-else-if="signedIn" />
	<BuilderLogin v-else />
</template>
<script>
import { defineComponent, onMounted } from "vue";
import { useAuth } from "../composables/useAuth.js";
import { useTranslation } from "../composables/useTranslation.js";
import BuilderWorkspace from "../components/builder/BuilderWorkspace.vue";
import BuilderLogin from "../components/builder/BuilderLogin.vue";
export default defineComponent({
	components: { BuilderWorkspace, BuilderLogin },
	setup() {
		const auth = useAuth();
		onMounted(auth.init);
		return { ...auth, ...useTranslation() };
	},
});
</script>
