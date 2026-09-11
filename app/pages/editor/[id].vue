<template>
  <BuilderWorkspace :key="$route.params.id" :projectId="$route.params.id === 'local' ? null : $route.params.id" />
</template>
<script>
import { defineComponent } from 'vue';
import BuilderWorkspace from '../../components/builder/BuilderWorkspace.vue';
export default defineComponent({ components: { BuilderWorkspace } });
</script>
