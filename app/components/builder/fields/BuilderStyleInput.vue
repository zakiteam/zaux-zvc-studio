<template>
  <div class="min-w-0">
    <div v-if="available" class="flex justify-end mb-1">
      <button type="button" class="text-[10px] text-zaux-dark-grey" :aria-pressed="enabled" @click="enabled = !enabled">
        {{ translate(enabled ? 'zx_builder_class_help_on' : 'zx_builder_class_help_off') }}
      </button>
    </div>
    <input ref="input" :value="draft" :aria-label="label" :disabled="disabled" :readonly="readonly"
      type="text" autocomplete="off" autocapitalize="off" :spellcheck="false" class="w-full px-2 py-1 font-mono bg-zaux-light"
      :role="assisted ? 'combobox' : undefined" :aria-autocomplete="assisted ? 'list' : undefined"
      :aria-expanded="assisted ? open : undefined" :aria-controls="open ? listId : undefined"
      :aria-activedescendant="open && suggestions.length ? `${listId}-${selected}` : undefined"
      :aria-describedby="open ? `${listId}-help` : undefined"
      @input="onInput" @focus="refresh()" @click="refresh()" @keyup="onKeyup" @keydown="onKeydown"
      @blur="onBlur" @compositionstart="composing = true; close()" @compositionend="onCompositionEnd" />
    <Teleport to="body">
      <div v-if="open" ref="popup" :style="position" class="fixed z-[1000] flex flex-col overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-white font-builder text-[12px] text-zaux-dark shadow-deeper"
        @mousedown.prevent>
        <ul :id="listId" role="listbox" :aria-label="translate('zx_builder_class_suggestions')" class="m-0 max-h-[160px] shrink-0 list-none overflow-auto p-1">
          <li v-for="(candidate, index) in suggestions" :id="`${listId}-${index}`" :key="candidate" role="option"
            :aria-selected="selected === index" :class="selected === index ? 'bg-zaux-accent/15' : ''"
            class="px-2 py-1 font-mono break-all cursor-pointer rounded-xxs" @mouseenter="selected = index" @click="accept(index)">
            {{ candidate }}
          </li>
        </ul>
        <div class="min-h-0 p-2 overflow-auto border-t-slim border-zaux-light-grey" aria-live="polite" :aria-busy="loading">
          <p class="mb-1 font-mono font-semibold break-all">{{ previewClass }}</p>
          <pre v-if="css" class="m-0 whitespace-pre-wrap break-all font-mono text-[11px]">{{ css }}</pre>
          <p v-else class="m-0 text-[11px] text-zaux-dark-grey">{{ translate(loading ? 'zx_builder_class_loading' : failed ? 'zx_builder_class_unavailable' : 'zx_builder_class_no_css') }}</p>
        </div>
        <p :id="`${listId}-help`" class="m-0 shrink-0 border-t-slim border-zaux-light-grey p-2 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_class_keys') }}</p>
      </div>
    </Teleport>
  </div>
</template>
<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { useRuntimeConfig, useState } from '#imports';
import { useTranslation } from '../../../composables/useTranslation.js';
import { loadTailwindCatalog, loadTailwindCss } from '../../../services/tailwind-assistance.js';
import { classToken, classSuggestions, completeClass } from '../../../../domain/tailwind-assistance.js';

export default defineComponent({
  props: {
    modelValue: { type: String, default: '' },
    label: String,
    disabled: Boolean,
    readonly: Boolean,
    assistance: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const config = useRuntimeConfig();
    const enabled = useState('builder-tailwind-assistance', () => true);
    const available = computed(() => props.assistance && config.public.tailwindAssistance !== false && config.public.tailwindAssistance !== 'false');
    const assisted = computed(() => available.value && enabled.value && !props.disabled && !props.readonly);
    const input = ref(null);
    const popup = ref(null);
    const draft = ref(props.modelValue);
    const catalog = shallowRef(null);
    const token = ref(null);
    const open = ref(false);
    const selected = ref(0);
    const composing = ref(false);
    const position = ref({});
    const css = ref('');
    const loading = ref(false);
    const failed = ref(false);
    const listId = `zb-classes-${useId()}`;
    let refreshId = 0;
    let previewId = 0;
    let timer;
    let request;
    const suggestions = computed(() => classSuggestions(token.value?.value ?? '', catalog.value));
    const previewClass = computed(() => suggestions.value[selected.value] ?? token.value?.value ?? '');

    function close() {
      refreshId++;
      open.value = false;
      cancelPreview();
    }
    function cancelPreview() {
      previewId++;
      clearTimeout(timer);
      request?.abort();
      loading.value = false;
    }
    function place() {
      const rect = input.value.getBoundingClientRect();
      const width = Math.min(440, window.innerWidth - 16);
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const useAbove = below < 280 && above > below;
      position.value = {
        width: `${width}px`, left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`,
        top: useAbove ? undefined : `${rect.bottom + 4}px`,
        bottom: useAbove ? `${window.innerHeight - rect.top + 4}px` : undefined,
        maxHeight: `${Math.max(0, Math.min(420, useAbove ? above : below))}px`,
      };
    }
    async function refresh(explicit = false) {
      close();
      const revision = refreshId;
      // Let an already open preview close before reopening the same candidate.
      await nextTick();
      if (revision !== refreshId) return;
      if (!assisted.value || composing.value || document.activeElement !== input.value) return;
      token.value = classToken(draft.value, input.value.selectionStart, input.value.selectionEnd);
      if (!token.value || (!explicit && !token.value.value)) return;
      selected.value = 0;
      failed.value = false;
      if (!catalog.value) {
        try { catalog.value = await loadTailwindCatalog(); }
        catch { if (revision === refreshId) failed.value = true; }
      }
      if (revision !== refreshId) return;
      place();
      open.value = true;
    }
    function commit() {
      if (!props.disabled && !props.readonly && draft.value !== props.modelValue) emit('update:modelValue', draft.value);
    }
    function onInput(event) {
      draft.value = event.target.value;
      if (!composing.value) refresh();
    }
    function onCompositionEnd(event) {
      composing.value = false;
      onInput(event);
    }
    function onBlur() { close(); commit(); }
    async function accept(index = selected.value) {
      const candidate = suggestions.value[index];
      if (!candidate || !token.value || !assisted.value) return;
      const result = completeClass(draft.value, token.value, candidate, catalog.value?.separator);
      draft.value = result.value;
      close();
      await nextTick();
      input.value?.focus({ preventScroll: true });
      input.value?.setSelectionRange(result.caret, result.caret);
      if (candidate.endsWith(catalog.value?.separator || ':')) refresh(true);
    }
    function onKeydown(event) {
      if (event.isComposing || composing.value) return;
      if (assisted.value && event.ctrlKey && event.code === 'Space') {
        event.preventDefault(); event.stopPropagation(); refresh(true); return;
      }
      if (open.value && event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); close(); return;
      }
      if (open.value && suggestions.value.length && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); event.stopPropagation();
          selected.value = (selected.value + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.value.length) % suggestions.value.length;
          nextTick(() => document.getElementById(`${listId}-${selected.value}`)?.scrollIntoView({ block: 'nearest' }));
          return;
        }
        if (event.key === 'Tab' || event.key === 'Enter') {
          event.preventDefault(); event.stopPropagation(); accept(); return;
        }
      }
      if (event.key === 'Enter') { event.preventDefault(); commit(); close(); }
      if (event.key === 'Tab') close();
    }
    function onKeyup(event) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) refresh();
    }
    watch(() => props.modelValue, value => {
      if (value !== draft.value) { draft.value = value; close(); }
    });
    watch(assisted, () => close());
    watch([open, previewClass], () => {
      cancelPreview();
      css.value = '';
      if (!open.value || !previewClass.value || previewClass.value.endsWith(catalog.value?.separator || ':')) return;
      if (previewClass.value.length > 512) return;
      const revision = previewId;
      loading.value = true;
      failed.value = false;
      timer = setTimeout(async () => {
        request = new AbortController();
        try {
          const result = await loadTailwindCss(previewClass.value, request.signal);
          if (revision === previewId) css.value = result;
        } catch {
          if (revision === previewId) failed.value = true;
        } finally {
          if (revision === previewId) loading.value = false;
        }
      }, 180);
    });
    function onScroll(event) {
      if (open.value && !popup.value?.contains(event.target)) close();
    }
    onMounted(() => {
      window.addEventListener('resize', close);
      window.addEventListener('scroll', onScroll, true);
    });
    onBeforeUnmount(() => {
      close();
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    });
    return { translate, available, assisted, enabled, input, popup, draft, open, suggestions, selected, previewClass, css, loading, failed,
      composing, position, listId, close, refresh, accept, onInput, onBlur, onKeydown, onKeyup, onCompositionEnd };
  },
});
</script>
