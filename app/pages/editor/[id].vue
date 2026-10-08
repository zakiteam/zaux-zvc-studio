<template>
  <BuilderWorkspace :key="$route.params.id" :projectId="$route.params.id === 'local' ? null : $route.params.id" />
</template>
<script>
import { defineComponent } from 'vue';
export default defineComponent({});
</script>
