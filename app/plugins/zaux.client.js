import ComponentsRenderer from '../../integrations/zaux/slot-renderer.js';
import { zxCoreSetup } from '@zx_core/setup';
import { zxPJSetup } from '@zx_project/setup';
import zauxConfig from '@zx/zaux.config';
export default defineNuxtPlugin(nuxtApp => {
  window[zauxConfig.appNameSpace] = {
    ...window[zauxConfig.appNameSpace],
    iconsAssetsPath: '/assets'
  };

  zxCoreSetup({ app: nuxtApp.vueApp });
  zxPJSetup({ app: nuxtApp.vueApp });
  nuxtApp.vueApp.component('ComponentsRenderer', ComponentsRenderer);
});
