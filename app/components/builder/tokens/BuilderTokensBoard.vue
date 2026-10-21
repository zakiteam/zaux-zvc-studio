<template>
  <div class="flex min-h-0 flex-1 flex-col bg-zaux-light">
    <!-- Toolbar: section shortcuts and a board filter. -->
    <div class="flex shrink-0 flex-wrap items-center gap-1 border-b-slim border-zaux-light-grey bg-zaux-white px-2 py-1">
      <nav class="flex min-w-0 flex-1 flex-wrap items-center gap-0.5" :aria-label="translate('zx_builder_tokens_sections')">
        <button v-for="section in sections" :key="section.id" type="button"
          class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold text-zaux-dark-grey transition-colors hover:bg-zaux-light hover:text-zaux-dark focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          @click="scrollTo(section.id)">{{ translate(section.label) }}</button>
      </nav>
      <BuilderInput v-model="search" type="search" class="w-[220px] max-[700px]:w-full" :placeholder="translate('zx_builder_search_tokens')" :label="translate('zx_builder_search_tokens')" />
    </div>

    <div ref="scroller" class="min-h-0 flex-1 overflow-auto">
      <div class="mx-auto max-w-[1280px] space-y-4 p-3 max-[700px]:p-2">
        <p class="text-[11px] leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_tokens_board_hint') }}</p>
        <p v-if="!hasResults" role="status" class="rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-2 text-[12px]">{{ translate('zx_builder_tokens_no_results') }}</p>

        <!-- Colors -->
        <section v-if="colorGroups.length" id="zb-tokens-colors" class="scroll-mt-2 space-y-2">
          <h2 class="text-[15px] font-semibold">{{ translate('zx_builder_tokens_colors') }}</h2>
          <div v-for="group in colorGroups" :key="group.id">
            <h3 class="mb-1 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate(group.label) }} <span class="tabular-nums">({{ group.variables.length }})</span></h3>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-1">
              <button v-for="variable in group.variables" :key="variable.name" type="button" :data-token="variable.name"
                class="group overflow-hidden rounded-xs border-slim bg-zaux-white text-left shadow-sm transition-shadow hover:shadow-close focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
                :class="selectedToken === variable.name ? 'border-zaux-accent ring-2 ring-zaux-accent/40' : 'border-zaux-light-grey'"
                :aria-pressed="selectedToken === variable.name" :title="variable.name" :aria-label="translate('zx_builder_tokens_edit', { name: variable.name })"
                @click="select(variable.name)">
                <span class="block h-[64px] border-b-slim border-zaux-light-grey"><BuilderTokenSample :group="group.id" :value="valueOf(variable)" /></span>
                <span class="flex items-center gap-0.5 px-1 pt-0.5">
                  <span class="min-w-0 flex-1 truncate text-[12px] font-semibold">{{ shortName(group, variable) }}</span>
                  <span v-if="isModified(variable)" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-zaux-accent" :title="translate('zx_builder_theme_modified')" :aria-label="translate('zx_builder_theme_modified')" />
                </span>
                <span class="block truncate px-1 pb-0.5 font-mono text-[10px] uppercase text-zaux-dark-grey">{{ colorLabel(valueOf(variable)) }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Typography: each font token with the Zaux text styles that use it. -->
        <section v-if="fontCards.length" id="zb-tokens-typography" class="scroll-mt-2 space-y-2">
          <h2 class="text-[15px] font-semibold">{{ translate('zx_builder_tokens_typography') }}</h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,520px),1fr))] gap-2">
            <article v-for="card in fontCards" :key="card.variable.name" :data-token="card.variable.name"
              class="min-w-0 overflow-hidden rounded-xs border-slim bg-zaux-white shadow-sm"
              :class="selectedToken === card.variable.name ? 'border-zaux-accent ring-2 ring-zaux-accent/40' : 'border-zaux-light-grey'">
              <button type="button" class="flex w-full items-start gap-1 border-b-slim border-zaux-light-grey px-2 py-1.5 text-left hover:bg-zaux-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
                :aria-pressed="selectedToken === card.variable.name" :aria-label="translate('zx_builder_tokens_edit', { name: card.variable.name })"
                @click="select(card.variable.name)">
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-0.5">
                    <span class="truncate text-[13px] font-semibold">{{ translate('zx_builder_tokens_font_role_' + card.role) }}</span>
                    <span v-if="isModified(card.variable)" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-zaux-accent" :title="translate('zx_builder_theme_modified')" :aria-label="translate('zx_builder_theme_modified')" />
                  </span>
                  <span class="block truncate font-mono text-[10px] text-zaux-dark-grey">{{ card.variable.name }}</span>
                  <span class="block truncate font-mono text-[11px]" :title="card.value">{{ card.value }}</span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block text-[10px] text-zaux-dark-grey">{{ card.styles.length ? translate('zx_builder_tokens_type_styles', { count: card.styles.length }) : translate('zx_builder_tokens_type_main') }}</span>
                  <span v-if="!card.loaded" class="mt-0.5 inline-block rounded-xxs bg-utility-warning/20 px-1 text-[10px] font-semibold">{{ translate('zx_builder_tokens_font_not_loaded') }}</span>
                </span>
              </button>
              <BuilderTypeSpecimen :family="card.value" :styles="card.specimen" :fonts="fonts" :sample="translate('zx_builder_fonts_sample')"
                :title="translate('zx_builder_tokens_specimen', { name: card.variable.name })" />
            </article>
          </div>
        </section>

        <!-- Radius, shadows, blur and border widths. -->
        <section v-for="group in shapeGroups" :key="group.id" :id="'zb-tokens-' + group.id" class="scroll-mt-2 space-y-2">
          <h2 class="text-[15px] font-semibold">{{ translate(group.label) }}</h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1">
            <button v-for="variable in group.variables" :key="variable.name" type="button" :data-token="variable.name"
              class="overflow-hidden rounded-xs border-slim bg-zaux-white text-left shadow-sm transition-shadow hover:shadow-close focus-visible:outline focus-visible:outline-2 focus-visible:outline-zaux-accent"
              :class="selectedToken === variable.name ? 'border-zaux-accent ring-2 ring-zaux-accent/40' : 'border-zaux-light-grey'"
              :aria-pressed="selectedToken === variable.name" :title="variable.name" :aria-label="translate('zx_builder_tokens_edit', { name: variable.name })"
              @click="select(variable.name)">
              <span class="block h-[88px] border-b-slim border-zaux-light-grey"><BuilderTokenSample :group="group.id" :value="valueOf(variable)" /></span>
              <span class="flex items-center gap-0.5 px-1 pt-0.5">
                <span class="min-w-0 flex-1 truncate text-[12px] font-semibold">{{ shortName(group, variable) }}</span>
                <span v-if="isModified(variable)" role="img" class="h-[8px] w-[8px] shrink-0 rounded-xxs bg-zaux-accent" :title="translate('zx_builder_theme_modified')" :aria-label="translate('zx_builder_theme_modified')" />
              </span>
              <span class="block truncate px-1 pb-0.5 font-mono text-[10px] text-zaux-dark-grey" :title="valueOf(variable)">{{ valueOf(variable) }}</span>
            </button>
          </div>
        </section>

        <!-- Icons: every symbol of the active set (global UI setting, applied by Icon.vue). -->
        <section v-if="icons.length" id="zb-tokens-icons" class="scroll-mt-2 space-y-2">
          <div class="flex flex-wrap items-center gap-1">
            <h2 class="text-[15px] font-semibold">{{ translate('zx_builder_tokens_icons') }}</h2>
            <div class="ml-auto grid auto-cols-fr grid-flow-col gap-0.25 rounded-xs bg-zaux-white p-0.25 shadow-sm" role="group" :aria-label="translate('zx_builder_ui_icon_set')">
              <button v-for="set in iconSetNames" :key="set" type="button" :aria-pressed="iconSet === set" :disabled="!canEditRemote"
                class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent disabled:cursor-not-allowed"
                :class="iconSet === set ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
                @click="setIconSet(set)">{{ set }}</button>
            </div>
          </div>
          <p class="text-[11px] leading-[1.6] text-zaux-dark-grey">{{ translate('zx_builder_tokens_icons_hint', { set: iconSet, count: iconCount }) }}</p>
          <ul class="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1" :aria-label="translate('zx_builder_tokens_icons')">
            <li v-for="name in icons" :key="name" :title="name"
              class="flex min-w-0 flex-col items-center gap-0.5 rounded-xs border-slim border-zaux-light-grey bg-zaux-white px-0.5 pb-0.5 pt-1.5 text-zaux-dark shadow-sm">
              <svg class="h-[28px] w-[28px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use :href="iconHref(iconSet, name)" /></svg>
              <span class="block w-full truncate text-center font-mono text-[10px] text-zaux-dark-grey">{{ name }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
<script>
import { computed, defineComponent, nextTick, ref, watch } from 'vue';
import { useBuilder } from '../../../composables/useBuilder.js';
import { tokenGroups, typographyStyles, colorHex } from '../../../data/styles/tokens.js';
import { styleVariableOverride } from '../../../../domain/styles.js';
import { iconSets, iconHref } from '@integration/options/icon-options.js';

const COLOR_GROUPS = ['components', 'editor', 'utility'];
const SHAPE_GROUPS = ['radius', 'shadows', 'blur', 'borders'];
const FONT_ROLES = ['main', 'display', 'body', 'cta', 'eyelet'];
const GENERIC_FAMILIES = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', 'inherit', 'initial'];

export default defineComponent({
  setup() {
    const builder = useBuilder();
    const search = ref('');
    const scroller = ref(null);
    const preset = computed(() => builder.document.value.styles);
    const fonts = computed(() => preset.value?.fonts ?? []);
    const matches = variable => variable.name.toLowerCase().includes(search.value.trim().toLowerCase());
    const filtered = ids => tokenGroups.filter(group => ids.includes(group.id))
      .map(group => ({ ...group, variables: group.variables.filter(matches) }))
      .filter(group => group.variables.length);
    const colorGroups = computed(() => filtered(COLOR_GROUPS));
    const shapeGroups = computed(() => filtered(SHAPE_GROUPS));
    function valueOf(variable) { return styleVariableOverride(preset.value, variable.name)?.value ?? variable.value; }
    function isModified(variable) { return !!styleVariableOverride(preset.value, variable.name); }
    // The first family of the stack must be a project font (or a generic family) to render as authored.
    function isLoaded(value) {
      const first = String(value).split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (!first || (GENERIC_FAMILIES.includes(first.toLowerCase()) && !/^["']/.test(String(value).trim()))) return true;
      return fonts.value.some(font => font.family.toLowerCase() === first.toLowerCase());
    }
    const fontCards = computed(() => {
      const group = tokenGroups.find(item => item.id === 'fonts');
      return FONT_ROLES.map(role => group.variables.find(variable => variable.name === '--zx-font-' + role))
        .filter(variable => variable && matches(variable))
        .map(variable => {
          const role = variable.name.slice('--zx-font-'.length);
          const value = valueOf(variable);
          const styles = typographyStyles.filter(style => style.font === variable.name);
          // The main token styles the page body (Zaux base.scss); show a body-sized sample.
          const specimen = styles.length ? styles : [{ name: 'body', label: 'body', fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 400, letterSpacing: 'normal', fontStyle: 'normal' }];
          return { variable, role, value, styles, specimen, loaded: isLoaded(value) };
        });
    });
    const iconSet = builder.iconSet;
    const iconSetNames = Object.keys(iconSets).sort();
    const iconCount = computed(() => iconSets[iconSet.value]?.length ?? 0);
    const icons = computed(() => (iconSets[iconSet.value] ?? []).filter(name => name.toLowerCase().includes(search.value.trim().toLowerCase())));
    function setIconSet(set) { if (set !== iconSet.value) builder.updateStyleUI('global.iconSet', set); }
    const sections = computed(() => [
      colorGroups.value.length && { id: 'colors', label: 'zx_builder_tokens_colors' },
      fontCards.value.length && { id: 'typography', label: 'zx_builder_tokens_typography' },
      ...shapeGroups.value.map(group => ({ id: group.id, label: group.label })),
      icons.value.length && { id: 'icons', label: 'zx_builder_tokens_icons' }
    ].filter(Boolean));
    const hasResults = computed(() => sections.value.length > 0);
    function shortName(group, variable) { return variable.name.startsWith(group.prefix) ? variable.name.slice(group.prefix.length) : variable.name; }
    function colorLabel(value) { return /^#|^\s*\d/.test(value) ? colorHex(value) : value; }
    function select(name) { builder.selectedToken.value = name; }
    function scrollTo(id) { scroller.value?.querySelector('#zb-tokens-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    // Selection from the panel reveals the matching board item.
    watch(builder.selectedToken, async name => {
      await nextTick();
      if (name) scroller.value?.querySelector(`[data-token="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'nearest' });
    });
    return { translate: builder.translate, selectedToken: builder.selectedToken, canEditRemote: builder.canEditRemote, search, scroller, fonts, colorGroups, shapeGroups, fontCards, sections, hasResults,
      iconSet, iconSetNames, iconCount, icons, iconHref, setIconSet, valueOf, isModified, shortName, colorLabel, select, scrollTo };
  }
});
</script>
