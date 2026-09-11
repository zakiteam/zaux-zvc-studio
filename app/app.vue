<template>
  <NuxtPage v-if="$route.path === '/preview'" />
  <StudioAccess v-else>
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </StudioAccess>
</template>
<script>
import { defineComponent } from 'vue';
import StudioAccess from './components/studio/StudioAccess.vue';
export default defineComponent({ components: { StudioAccess } });
</script>
