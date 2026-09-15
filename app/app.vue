<template>
  <NuxtPage v-if="$route.path === '/preview'" />
  <StudioAccess v-else>
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </StudioAccess>
</template>
<script>
import { computed, defineComponent } from 'vue';
import StudioAccess from './components/studio/StudioAccess.vue';
import { useHead, useRoute } from '#imports';
import { useStudioTheme } from './composables/useStudioTheme.js';
export default defineComponent({
  components: { StudioAccess },
  setup() {
    const route = useRoute();
    const { theme } = useStudioTheme();
    const isPreview = computed(() => route.path === '/preview' || route.path.startsWith('/view/'));
    useHead(() => ({
      htmlAttrs: {
        'data-studio-theme': isPreview.value ? null : theme.value,
        class: { 'zaux-theme-scheme--dark': !isPreview.value && theme.value === 'dark' }
      }
    }));
  }
});
</script>
