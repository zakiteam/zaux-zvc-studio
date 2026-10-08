<template>
  <BuilderWorkspace :key="$route.fullPath" designer :designerComponentId="typeof $route.query.component === 'string' ? $route.query.component : null" />
</template>
<script>
import { defineComponent } from 'vue';
// Component designer: isolated editing of the shared global ZVC/ZVP library (see docs/global-components.md).
export default defineComponent({});
</script>
