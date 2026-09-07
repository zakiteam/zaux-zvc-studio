<template>
  <main class="zb-app grid min-h-dvh place-items-center bg-zaux-light p-4 font-main text-zaux-dark">
    <form class="w-full max-w-[360px] rounded-s border-slim border-zaux-light-grey bg-zaux-white p-4 shadow-deep" @submit.prevent="submit">
      <span class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">ZAUX STUDIO</span>
      <h1 class="mt-1 text-[25px] font-normal tracking-[-0.7px]">{{ translate('zx_builder_login') }}</h1>
      <p class="mt-1 text-[12px] leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_login_hint') }}</p>
      <div class="zb-field mt-3"><label for="login-email">{{ translate('zx_builder_email') }}</label><BuilderInput id="login-email" v-model="email" type="email" autocomplete="email" required /></div>
      <div class="zb-field mt-2.5"><label for="login-password">{{ translate('zx_builder_password') }}</label><BuilderInput id="login-password" v-model="password" type="password" autocomplete="current-password" required /></div>
      <p v-if="error" class="mt-2 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error" role="alert">{{ translate(error) }}</p>
      <button class="mt-3 inline-flex min-h-[36px] w-full items-center justify-center rounded-xxs bg-zaux-accent px-2.5 py-1.5 text-[12px] text-zaux-white hover:bg-zaux-dark-accent" :disabled="loading" type="submit">{{ translate(loading ? 'zx_builder_logging_in' : 'zx_builder_login') }}</button>
    </form>
  </main>
</template>
<script>
import { defineComponent, ref } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderInput from './BuilderInput.vue';
export default defineComponent({
  components: { BuilderInput },
  setup() {
    const auth = useAuth(); const translation = useTranslation(); const email = ref(''); const password = ref(''); const loading = ref(false);
    async function submit() { loading.value = true; await auth.signIn(email.value.trim(), password.value); loading.value = false; }
    return { ...translation, ...auth, email, password, loading, submit };
  }
});
</script>
