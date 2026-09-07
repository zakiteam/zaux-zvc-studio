import { zxCoreSetup } from '@zx_core/setup';
import { zxPJSetup } from '@zx_project/setup';
export default defineNuxtPlugin(nuxtApp => {
  zxCoreSetup({ app: nuxtApp.vueApp });
  zxPJSetup({ app: nuxtApp.vueApp });
});
