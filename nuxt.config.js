import { fileURLToPath } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
const path = value => fileURLToPath(new URL(value, import.meta.url));
const aliases = {};
for (const area of ['core', 'project']) {
  for (const kind of ['common', 'shared', 'utils', 'overrides', 'virtual', 'templates']) {
    const name = `@zx_${area}/${kind === 'templates' ? 'templates' : `components/${kind}`}/index`;
    aliases[name] = path(`./integrations/zaux/generated/${area}-${kind}.js`);
    aliases[`${name}.js`] = aliases[name];
  }
}
export default defineNuxtConfig({
  compatibilityDate: '2026-09-06',
  ssr: false,
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    }
  },
  devtools: { enabled: false },
  alias: {
    ...aliases,
    '@zx_core/storybook/data/_generated/attributes-hooks.json': path('./integrations/zaux/generated/attributes-hooks.json'),
    '@zx_style/tailwind.config': path('./integrations/zaux/generated/tailwind.runtime.json'),
    '@zx_assets': path('./vendor/zaux/public/assets'),
    '@zx/zaux.config': path('./integrations/zaux/config.js'),
    '@zx_core': path('./vendor/zaux/core'),
    '@zx_project': path('./vendor/zaux/project'),
    '@zx_style': path('./vendor/zaux/style'),
    '@zx_.zaux': path('./vendor/zaux/.zaux'),
    '@zx': path('./vendor/zaux'),
    '@domain': path('./domain'),
    '@integration': path('./integrations/zaux')
  },
  css: ['swiper/css', 'swiper/css/grid', 'swiper/css/effect-fade', '~/assets/styles/zaux.scss', '~/assets/styles/editor.css'],
  postcss: { plugins: { tailwindcss: { config: path('./integrations/zaux/tailwind.config.js') } } },
  vite: {
    plugins: [AutoImport({ include: [/vendor[\\/]zaux[\\/].*\.[jt]s$/, /vendor[\\/]zaux[\\/].*\.vue/, /vendor[\\/]zaux[\\/].*\.vue\?vue/], imports: ['vue'], dts: false })],
    define: { ZAUX_CORE_VERSION: JSON.stringify('2.3.4'), ZAUX_PJ_VERSION: JSON.stringify('0.1.0') },
    vue: { template: { compilerOptions: { isCustomElement: tag => tag.startsWith('swiper-') } } },
    resolve: { dedupe: ['vue', 'pinia'] }
  },
  nitro: { publicAssets: [{ dir: path('./vendor/zaux/public'), baseURL: '/' }] },
  app: { head: { title: 'Zaux Studio — Virtual Component Builder', htmlAttrs: { lang: 'it' }, link: [{ rel: 'stylesheet', href: '/assets/font/main/stylesheet.css' }] } }
});
