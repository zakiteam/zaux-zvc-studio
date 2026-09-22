import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
const path = value => fileURLToPath(new URL(value, import.meta.url));
const zauxPackage = JSON.parse(readFileSync(path('./vendor/zaux/package.json'), 'utf8'));
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
    mediaStorageDir: '',
    mediaPublicBaseUrl: '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    }
  },
  devtools: { enabled: true },
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
  css: [
    'swiper/css',
    'swiper/css/grid',
    'swiper/css/effect-fade',
    '~/assets/styles/zaux.scss',
    '~/assets/styles/editor.css'
  ],
  postcss: { plugins: { tailwindcss: { config: path('./integrations/zaux/tailwind.config.js') } } },
  vite: {
    plugins: [AutoImport({ include: [/vendor[\\/]zaux[\\/].*\.[jt]s$/, /vendor[\\/]zaux[\\/].*\.vue/, /vendor[\\/]zaux[\\/].*\.vue\?vue/], imports: ['vue'], dts: false })],
    define: { ZAUX_CORE_VERSION: JSON.stringify(zauxPackage.coreVersion), ZAUX_PJ_VERSION: JSON.stringify('0.1.0') },
    vue: { template: { compilerOptions: { isCustomElement: tag => tag.startsWith('swiper-') } } },
    resolve: { dedupe: ['vue', 'pinia'] }
  },
  nitro: {
    // Bundle local Tailwind config, tokens and plugins in dev as well as production.
    externals: { inline: [path('./integrations/zaux/'), path('./vendor/zaux/')] },
    publicAssets: [{ dir: path('./vendor/zaux/public'), baseURL: '/' }]
  },
  app: { head: { title: 'Zaux Studio — Virtual Component Builder', htmlAttrs: { lang: 'it' }, link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap' }
  ] } }
});
