<template>
  <main class="grid h-screen p-4 zb-app min-h-dvh place-items-center bg-zaux-light font-builder text-zaux-dark">

    <div class="flex flex-col gap-4">
      <div class="mx-auto">
        <img class="mx-auto max-w-8" :src="studioLogo" />
        <span class="text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey mb-4">ZAUX STUDIO</span>
      </div>
      <div class="w-full max-w-[360px] rounded-s border-slim border-zaux-light-grey bg-zaux-white p-4 shadow-deep text-center">
        <form class="" @submit.prevent="submit">
          
          <h1 class="mt-1 text-[25px] font-normal tracking-[-0.7px]">{{ translate('zx_builder_login') }}</h1>
          <p class="mt-1 text-[12px] leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_login_hint') }}</p>
          <div class="mt-3 zb-field"><label for="login-email" class="sr-only">{{ translate('zx_builder_email') }}</label><BuilderInput id="login-email" v-model="email" type="email" :placeholder="translate('zx_builder_email')" autocomplete="email" required /></div>
          <div class="zb-field mt-2.5"><label class="sr-only" for="login-password">{{ translate('zx_builder_password') }}</label><BuilderInput id="login-password" v-model="password" :placeholder="translate('zx_builder_password')" type="password" autocomplete="current-password" required /></div>
          <p v-if="error" class="mt-2 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error" role="alert">{{ translate(error) }}</p>
          <button class="mt-3 inline-flex min-h-[36px] w-full items-center justify-center rounded-xxs bg-zaux-accent px-2.5 py-1.5 text-[12px] text-zaux-white hover:bg-zaux-dark-accent" :disabled="loading" type="submit">{{ translate(loading ? 'zx_builder_logging_in' : 'zx_builder_login') }}</button>
        </form>
      </div>
    </div>
  </main>
</template>
<script>
import studioLogo from '../../assets/images/logo-studio.svg?url';
import { defineComponent, ref } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderInput from './fields/BuilderInput.vue';
export default defineComponent({
  components: { BuilderInput },
  setup() {
    const auth = useAuth(); const translation = useTranslation(); const email = ref(''); const password = ref(''); const loading = ref(false);
    async function submit() { loading.value = true; await auth.signIn(email.value.trim(), password.value); loading.value = false; }
    return { studioLogo, ...translation, ...auth, email, password, loading, submit };
  }
});
</script>
