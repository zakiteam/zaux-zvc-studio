<template>
  <NuxtPage v-if="$route.path === '/preview'" />
  <StudioAccess v-else>
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </StudioAccess>
</template>
<script>
import { defineComponent } from 'vue';
import StudioAccess from './components/studio/StudioAccess.vue';
import { useHead, useRoute } from '#imports';
import { useStudioTheme } from './composables/useStudioTheme.js';
export default defineComponent({
  components: { StudioAccess },
  setup() {
    const route = useRoute();
    const { theme } = useStudioTheme();
    useHead(() => ({
      htmlAttrs: {
        'data-studio-theme': route.path === '/preview' ? null : theme.value,
        class: { 'zaux-theme-scheme--dark': route.path !== '/preview' && theme.value === 'dark' }
      }
    }));
  }
});
</script>
