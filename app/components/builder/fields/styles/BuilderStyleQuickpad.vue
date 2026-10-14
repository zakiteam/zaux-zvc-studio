<template>
  <div class="flex min-w-0 flex-col gap-1">
    <div class="flex min-w-0 items-center gap-1">
      <div role="group" :aria-label="translate('zx_builder_quick_style_controls')" class="flex shrink-0 gap-0.25 rounded-xs bg-zaux-light p-0.25">
        <button
          v-for="tab in views"
          :key="tab.id"
          type="button"
          :aria-label="tabLabel(tab) + (configured(tab) ? ' · ' + translate('zx_builder_quick_style_set') : '')"
          :title="tabLabel(tab)"
          :aria-expanded="active === tab.id"
          :aria-controls="panelId"
          :class="active === tab.id
            ? 'bg-zaux-white text-zaux-accent shadow-sm'
            : 'text-zaux-dark-grey hover:bg-zaux-white/70 hover:text-zaux-dark'"
          class="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-xxs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zaux-accent"
          @click="toggle(tab.id)"
        >
          <!-- Masked so the icon follows the text color (hover, active accent). -->
          <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="tabIcon(tab)" />
          <span v-if="configured(tab)" aria-hidden="true" class="absolute right-[3px] top-[3px] h-[5px] w-[5px] rounded-full bg-zaux-accent" />
        </button>
      </div>
      <span class="ml-auto min-w-0 truncate text-[10px] text-zaux-dark-grey" :title="scopeTitle">{{ scopeLabel }}</span>
    </div>
    <section v-if="activeTab" :id="panelId" :aria-label="tabLabel(activeTab)" class="rounded-xs border-slim border-zaux-light-grey">
      <header class="flex min-w-0 items-center gap-1 border-b-slim border-zaux-light-grey px-1.5 py-1">
        <h3 class="m-0 min-w-0 flex-1 truncate text-[11px] font-semibold">{{ tabLabel(activeTab) }}</h3>
        <!-- Global/side switch of the tab's spacing, border or rounding sections, as in the Inspector. -->
        <button
          v-for="group in activeTab.groups.filter(item => item.globalControls)"
          :key="group.id"
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded-xxs bg-zaux-light px-1 py-0.5 text-[10px] disabled:opacity-40"
          :disabled="disabled || !editable"
          :aria-pressed="!!granular[group.id]"
          :aria-label="translate(granular[group.id] ? 'zx_builder_style_use_global' : 'zx_builder_style_use_granular') + ': ' + translate(`zx_builder_style_${group.id}`)"
          :title="translate(granular[group.id] ? 'zx_builder_style_use_global' : 'zx_builder_style_use_granular')"
          @click="granular[group.id] = !granular[group.id]"
        >
          <img :src="granular[group.id] ? '/assets/builder/style-granular.svg' : '/assets/builder/style-global.svg'" width="14" height="14" alt="" class="dark:invert" />
          {{ translate(granular[group.id] ? 'zx_builder_style_granular' : 'zx_builder_style_global') }}
        </button>
      </header>
      <div class="max-h-[min(45vh,340px)] overflow-y-auto overscroll-contain px-1.5 pb-2 pt-1.5">
        <p v-if="editError" role="status" class="mb-1 text-[11px] text-zaux-accent">{{ translate(editError) }}</p>
        <p v-if="!editable" class="mb-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_style_dynamic') }}</p>
        <fieldset :disabled="!editable || disabled" class="min-w-0">
          <!-- Replace one tab's UI with <template #tab-<id>="{ tab, editor }">; editor is useNodeStyleEditor. -->
          <slot :name="`tab-${activeTab.id}`" :tab="activeTab" :editor="editor">
            <div v-for="group in activeTab.groups" :key="group.id" class="min-w-0 [&+&]:mt-2 [&+&]:border-t-slim [&+&]:border-zaux-light-grey [&+&]:pt-2">
              <p v-if="activeTab.groups.length > 1" class="mb-1 text-[11px] font-semibold">{{ translate(`zx_builder_style_${group.id}`) }}</p>
              <div class="grid grid-cols-2 gap-x-2 gap-y-2">
                <BuilderStyleControl v-for="control in visibleControls(group)" :key="control.id" :control="control" :editor="editor" />
              </div>
            </div>
          </slot>
        </fieldset>
      </div>
    </section>
  </div>
</template>
<script>
import { computed, defineComponent, ref, useId, watch } from 'vue';
import { useTranslation } from '../../../../composables/useTranslation.js';
import { useNodeStyleEditor } from '../../../../composables/useNodeStyleEditor.js';
import { descendingStyles } from '../../../../../integrations/zaux/responsive-styles.js';
import { styleVisibility, styleViews, visibleStyleSections } from '../../../../../integrations/zaux/style-visibility.js';
import { nodeStyleSections, styleBreakpoints } from '../../../../../integrations/zaux/controls/node-style-controls.js';
import { quickStyleTabs } from '../../../../../integrations/zaux/controls/quick-style-controls.js';

// Last open tab, kept while the editor page is open.
let lastTab = '';

// Compact style controls for one class list: a row of tab icons, at most one tab open.
// Tabs come from a view preset (quickStyleTabs by default); controls apply immediately.
export default defineComponent({
  props: {
    modelValue: { type: String, default: '' },
    // Breakpoint scope the controls edit ('' is the base).
    scope: { type: String, default: '' },
    tabs: { type: Array, default: () => quickStyleTabs },
    // Tabs not built from nodeStyleSections ({ id, label?, icon?, set? }), shown first;
    // their UI comes from the `tab-<id>` slot.
    extraTabs: { type: Array, default: () => [] },
    // Identity of the styled node: clears a previous edit error when it changes.
    target: { default: null },
    disabled: Boolean
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const panelId = useId();
    const scope = computed(() => props.scope);
    const editor = useNodeStyleEditor({
      classes: () => props.modelValue,
      scope,
      disabled: () => props.disabled,
      target: () => props.target,
      onChange: value => emit('update:modelValue', value)
    });
    // The viewport policy applies here too: a tab shows only what the Inspector would show.
    const views = computed(() => [
      ...props.extraTabs.map(tab => ({ ...tab, groups: [] })),
      ...styleViews(props.tabs, visibleStyleSections(nodeStyleSections, styleVisibility(props.scope)))
    ]);
    const active = ref(lastTab);
    const activeTab = computed(() => views.value.find(tab => tab.id === active.value) ?? null);
    watch(active, value => { lastTab = value; });
    function toggle(id) {
      active.value = active.value === id ? '' : id;
    }
    const tabLabel = tab => translate(tab.label ?? `zx_builder_style_${tab.id}`);
    // Zaux's Tailwind palette replaces the default colors, so there is no bg-current: paint inline.
    function tabIcon(tab) {
      const image = `url("/assets/builder/quickpad-${tab.icon ?? tab.id}.svg")`;
      return {
        backgroundColor: 'currentColor',
        maskImage: image, WebkitMaskImage: image,
        maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center'
      };
    }
    // Marks tabs whose controls hold an authored value at the edited scope.
    const configured = tab => !!tab.set || tab.groups.some(group =>
      [...group.controls, ...(group.globalControls ?? [])].some(control => editor.isSet(control)));
    const scopeLabel = computed(() => props.scope
      ? styleBreakpoints.find(item => item.value === props.scope)?.label ?? props.scope
      : translate(descendingStyles ? 'zx_builder_style_descending_base' : 'zx_builder_style_base'));
    const scopeTitle = computed(() => translate(descendingStyles ? 'zx_builder_style_descending_scope' : 'zx_builder_style_breakpoint') + ': ' + scopeLabel.value);
    const { editError, editable, granular, visibleControls } = editor;
    return { translate, panelId, editor, editError, editable, granular, visibleControls, views, active, activeTab, toggle, tabLabel, tabIcon, configured, scopeLabel, scopeTitle };
  }
});
</script>
