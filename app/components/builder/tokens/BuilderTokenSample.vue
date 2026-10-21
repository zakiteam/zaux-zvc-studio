<template>
  <!-- Samples use fixed light surfaces and the project's values, independently of the Studio light/dark theme. -->
  <span class="relative block h-full w-full overflow-hidden" aria-hidden="true">
    <template v-if="kind === 'color'">
      
      <!-- Only one layer is a valid color: RGB channels or a complete CSS color. -->
      <span :key="'rgb-' + value" class="absolute inset-0" :style="{ backgroundColor: `rgb(${value})` }" />
      <span :key="'css-' + value" class="absolute inset-0" :style="{ backgroundColor: value }" />
    </template>
    <span v-else class="absolute inset-0 flex items-center justify-center" :style="{ backgroundColor: '#f2f2f4' }">
      <span v-if="kind === 'radius'" class="block h-[62%] max-h-[56px] w-[62%] max-w-[56px] border-2 border-solid"
        :style="{ borderRadius: value, borderColor: '#363636', backgroundColor: '#ffffff' }" />
      <span v-else-if="kind === 'shadows'" class="zb-project-swatch block h-[56%] max-h-[48px] w-[56%] max-w-[64px] rounded-[6px]"
        :style="{ boxShadow: value, backgroundColor: '#ffffff' }" />
      <span v-else-if="kind === 'blur'" class="relative block h-[66%] max-h-[56px] w-[66%] max-w-[72px]">
        <span class="absolute inset-0 rounded-xxs" :style="{ filter: `blur(${value})`, background: 'conic-gradient(#ff5f6d, #ffc371, #47cf73, #3e8bff, #ff5f6d)' }" />
      </span>
      <span v-else-if="kind === 'borders'" class="block h-[56%] max-h-[48px] w-[56%] max-w-[64px] rounded-[4px] border-solid"
        :style="{ borderWidth: value, borderColor: '#363636', backgroundColor: '#ffffff' }" />
      <span v-else class="font-mono text-[11px]" :style="{ color: '#363636' }">Aa</span>
    </span>
  </span>
</template>
<script>
import { computed, defineComponent } from 'vue';

export default defineComponent({
  // group: token group id from app/data/styles/tokens.js; value: current CSS value.
  props: { group: { type: String, required: true }, value: { type: String, default: '' } },
  setup(props) {
    const kind = computed(() => ['components', 'editor', 'utility'].includes(props.group) ? 'color' : props.group);
    return { kind };
  }
});
</script>
