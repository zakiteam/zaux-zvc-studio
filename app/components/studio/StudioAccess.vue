<template>
  <div v-if="!ready" class="grid min-h-dvh h-screen place-items-center bg-zaux-light font-builder text-[12px] text-zaux-dark-grey">
    {{ translate('zx_builder_loading') }}
  </div>
  <div v-else-if="signedIn" :key="user.id"><slot /></div>
  <BuilderLogin v-else />
</template>
<script>
import { defineComponent, onMounted } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderLogin from '../builder/BuilderLogin.vue';

export default defineComponent({
  components: { BuilderLogin },
  setup() {
    const auth = useAuth();
    const translation = useTranslation();
    onMounted(() => {
      auth.init();
      try { translation.setLanguage(localStorage.getItem('zx_builder_language') ?? 'it'); } catch { /* Use the default language. */ }
    });
    return { ...auth, ...translation };
  }
});
</script>
