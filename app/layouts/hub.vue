<template>
  <div class="zb-app flex h-screen bg-zaux-light font-builder text-[13px] text-zaux-dark max-[700px]:flex-col">
    <aside class="flex h-full w-[240px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white p-3 max-[700px]:w-full max-[700px]:border-b-slim">
      <NuxtLink to="/" class="mb-6 flex items-center gap-1.5 py-1" aria-label="Zaux Studio">
        <img :src="studioLogo" alt="" class="h-[32px] w-[32px]" />
        <span class="font-semibold text-eyelet-s font-builder">ZAUX STUDIO</span>
      </NuxtLink>
      <nav :aria-label="translate('zx_builder_hub_navigation')" class="flex flex-col gap-1">
        <NuxtLink to="/" aria-current="page" class="rounded-xs bg-zaux-accent/10 px-2 py-1.5 font-semibold text-zaux-accent">
          {{ translate('zx_builder_projects') }}
        </NuxtLink>
        <NuxtLink to="/editor/local" class="rounded-xs px-2 py-1.5 hover:bg-zaux-light">
          {{ translate('zx_builder_hub_local') }}
        </NuxtLink>
      </nav>
      <div class="mt-auto border-t-slim border-zaux-light-grey pt-2 max-[700px]:mt-3">
        <p class="mb-2 break-all text-[11px] text-zaux-dark-grey">{{ user?.email }}</p>
        <BuilderDropdown contentClass="py-2 flex flex-col gap-2" :label="translate('zx_builder_account')" icon="user" :items="accountMenuItems" @select="accountAction" />
      </div>
    </aside>
    <main class="min-w-0 flex-1 p-6 max-[700px]:p-3"><slot /></main>
  </div>
</template>
<script>
import { computed, defineComponent } from 'vue';
import studioLogo from '../assets/images/logo-studio.svg?url';
import { useAuth } from '../composables/useAuth.js';
import { useTranslation } from '../composables/useTranslation.js';
import BuilderDropdown from '../components/builder/BuilderDropdown.vue';
import { useStudioTheme } from '../composables/useStudioTheme.js';
export default defineComponent({
  components: { BuilderDropdown },
  setup() {
    const auth = useAuth();
    const { translate } = useTranslation();
    const { theme, toggleTheme } = useStudioTheme();
    const accountMenuItems = computed(() => [
      { id: 'theme', label: translate(theme.value === 'dark' ? 'zx_builder_theme_light' : 'zx_builder_theme_dark') },
      { id: 'logout', label: translate('zx_builder_logout'), icon: 'close' }
    ]);
    function accountAction(item) {
      if (item.id === 'theme') toggleTheme();
      else if (item.id === 'logout') return auth.signOut();
    }
    return { studioLogo, user: auth.user, translate, accountMenuItems, accountAction };
  }
});
</script>
