<template>
  <div class="zb-app flex h-screen overflow-hidden bg-zaux-light font-builder text-[13px] text-zaux-dark max-[700px]:h-auto max-[700px]:min-h-dvh max-[700px]:flex-col max-[700px]:overflow-visible">
    <aside class="flex h-full px-1 w-[232px] shrink-0 flex-col border-r-slim border-zaux-light-grey bg-zaux-white max-[700px]:h-auto max-[700px]:w-full max-[700px]:border-b-slim max-[700px]:border-r-0">
      <NuxtLink to="/" class="flex h-[52px] shrink-0 items-center gap-1 px-1" aria-label="Zaux Studio">
        <img :src="studioLogo" alt="" class="h-[24px] w-[24px]" />
      </NuxtLink>
      <nav :aria-label="translate('zx_builder_hub_navigation')" class="flex flex-col gap-[2px] px-1 max-[700px]:flex-row max-[700px]:flex-wrap max-[700px]:pb-1">
        <NuxtLink to="/" aria-current="page" class="flex items-center gap-1 rounded-xxs bg-zaux-light px-1 py-0.75 text-[12px] font-semibold text-zaux-dark">
          <Icon iconName="apps" size="text-icon-xxs" class="text-zaux-accent" aria-hidden="true" />
          {{ translate('zx_builder_projects') }}
        </NuxtLink>
        <NuxtLink to="/editor/local" class="flex items-center gap-1 rounded-xxs px-1 py-0.75 text-[12px] text-zaux-dark-grey hover:bg-zaux-light hover:text-zaux-dark">
          <Icon iconName="tech" size="text-icon-xxs" aria-hidden="true" />
          {{ translate('zx_builder_hub_local') }}
        </NuxtLink>
        <button type="button" class="flex items-center gap-1 rounded-xxs px-1 py-0.75 text-left text-[12px] text-zaux-dark-grey hover:bg-zaux-light hover:text-zaux-dark" @click="fontsOpen = true">
          <Icon iconName="book-open" size="text-icon-xxs" aria-hidden="true" />
          {{ translate('zx_builder_fonts_library') }}
        </button>
      </nav>
      <div class="mt-auto flex items-center gap-1 border-t-slim border-zaux-light-grey p-1">
        <span aria-hidden="true" class="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-zaux-accent/15 text-[11px] font-semibold uppercase text-zaux-accent">{{ initial }}</span>
        <div class="flex-1 min-w-0">
          <p class="truncate text-[11px]" :title="user?.email">{{ user?.email }}</p>
          <p class="text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_hub_zaux_version', { version: zauxProjectVersion }) }}</p>
        </div>
        <BuilderDropdown
          :label="translate('zx_builder_account')"
          icon="settings"
          iconOnly
          btnTheme="alt1"
          :extraTriggerProps="{ iconName: 'settings', hasIcon: true, actionIcon: false }"
          :popOverProps="{ position: menuPosition }"
          :items="accountMenuItems"
          @select="accountAction"
        />
      </div>
    </aside>
    <BuilderFontLibrary v-if="fontsOpen" manage @close="fontsOpen = false" />
    <main class="zb-scroll min-w-0 flex-1 overflow-y-auto"><slot /></main>
  </div>
</template>
<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import studioLogo from '../assets/images/logo-studio.svg?url';
import { useAuth } from '../composables/useAuth.js';
import { useTranslation } from '../composables/useTranslation.js';
import { useStudioTheme } from '../composables/useStudioTheme.js';
import { zauxProjectVersion } from '../../integrations/zaux/version.js';
export default defineComponent({
  setup() {
    const fontsOpen = ref(false);
    const auth = useAuth();
    const { translate, language, setLanguage } = useTranslation();
    const { theme, toggleTheme } = useStudioTheme();
    const initial = computed(() => (auth.user.value?.email ?? '?').charAt(0));
    // The menu is wider than the sidebar: open it rightwards over the page, except on narrow
    // screens where the sidebar becomes a full-width bar and the trigger sits on the right edge.
    const narrow = ref(false);
    let media;
    const updateNarrow = () => { narrow.value = !!media?.matches; };
    onMounted(() => { media = window.matchMedia('(max-width: 700px)'); updateNarrow(); media.addEventListener('change', updateNarrow); });
    onBeforeUnmount(() => media?.removeEventListener('change', updateNarrow));
    const menuPosition = computed(() => (narrow.value ? 'top-right' : 'top-left'));
    // Same account actions as the editor menu, so preferences are reachable from both.
    const accountMenuItems = computed(() => [
      { id: 'language-it', heading: translate('zx_builder_language'), label: translate('zx_builder_language_it'), active: language.value === 'it' },
      { id: 'language-en', label: translate('zx_builder_language_en'), active: language.value === 'en' },
      { id: 'theme', separator: true, label: translate(theme.value === 'dark' ? 'zx_builder_theme_light' : 'zx_builder_theme_dark') },
      { id: 'logout', label: translate('zx_builder_logout'), icon: 'close' }
    ]);
    function accountAction(item) {
      if (item.id === 'language-it' || item.id === 'language-en') setLanguage(item.id.slice(-2));
      else if (item.id === 'theme') toggleTheme();
      else if (item.id === 'logout') return auth.signOut();
    }
    return { fontsOpen, studioLogo, zauxProjectVersion, initial, menuPosition, user: auth.user, translate, accountMenuItems, accountAction };
  }
});
</script>
