<template>
  <!-- Icon button of a style category, shared by the Inspector quickpad and Quick style tabs.
       `set` shows the accent dot: the category holds authored values at the edited scope and state.
       ARIA state attributes (aria-current, aria-expanded…) and events fall through to the button. -->
  <button
    type="button"
    :aria-label="label + (set ? ' · ' + translate('zx_builder_quick_style_set') : '')"
    :title="label"
    :class="active
      ? 'bg-zaux-white text-zaux-accent shadow-sm'
      : 'text-zaux-dark-grey hover:bg-zaux-white/70 hover:text-zaux-dark'"
    class="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-xxs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zaux-accent"
  >
    <!-- Masked so the icon follows the text color (theme, hover, active accent). -->
    <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="iconStyle" />
    <span v-if="set" aria-hidden="true" class="absolute right-[3px] top-[3px] h-[5px] w-[5px] rounded-xxs bg-zaux-accent" />
  </button>
</template>
<script>
import { computed, defineComponent } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';

export default defineComponent({
  props: {
    // Icon name: /assets/builder/quickpad-<icon>.svg
    icon: { type: String, required: true },
    // Translated label.
    label: { type: String, default: '' },
    active: Boolean,
    set: Boolean
  },
  setup(props) {
    const { translate } = useTranslation();
    // Zaux's Tailwind palette replaces the default colors, so there is no bg-current: paint inline.
    const iconStyle = computed(() => {
      const image = `url("/assets/builder/quickpad-${props.icon}.svg")`;
      return {
        backgroundColor: 'currentColor',
        maskImage: image, WebkitMaskImage: image,
        maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center'
      };
    });
    return { translate, iconStyle };
  }
});
</script>
