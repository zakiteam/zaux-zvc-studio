<template>
  <section class="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white shadow-sm">
    <div class="flex h-[40px] shrink-0 items-center gap-1 px-1" :class="open ? 'border-b-slim border-zaux-light-grey' : ''">
      <BuilderButton size="xs" variant="alt1" :icon="open ? 'chevron-down' : 'chevron-right'" iconOnly
        :label="translate('zx_builder_theme_toggle_props')" :aria-expanded="open" @click="$emit('toggle')" />
      <h3 class="min-w-0 flex-1 truncate text-[11px] font-semibold">{{ translate('zx_builder_theme_preview_controls') }}</h3>
      <div v-show="open" class="flex items-center gap-0.5" role="tablist" :aria-label="translate('zx_builder_theme_preview_controls')">
        <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="mode === tab.id" :title="translate(tab.title)"
          class="rounded-xxs px-1 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          :class="mode === tab.id ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
          @click="mode = tab.id">{{ translate(tab.label) }}</button>
      </div>
    </div>
    <div v-show="open" class="min-h-0 flex-1 overflow-auto p-2">
      <template v-if="mode === 'fields'">
        <p v-if="dirty" role="status" class="mb-2 text-[11px]">{{ translate('zx_builder_theme_props_pending') }}</p>
        <p v-if="!fields.length" class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_theme_props_empty') }}</p>
        <fieldset :disabled="dirty" class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-2 gap-y-1.5 border-none p-0">
          <div v-for="field in fields" :key="field.key" class="min-w-0" :class="['json', 'textarea'].includes(field.type) ? 'col-span-full' : ''">
            <p class="mb-0.5 truncate font-mono text-[11px] text-zaux-dark-grey" :title="field.key">{{ field.key }}</p>
            <BuilderValue :modelValue="modelValue[field.key]" :type="field.type" :label="field.key" :options="fieldOptions(field)" :disabled="dirty"
              @update:modelValue="changeField(field.key, $event)" />
          </div>
        </fieldset>
      </template>
      <template v-else>
        <BuilderCodeEditor v-model="draft" :label="translate('zx_builder_theme_preview_props')" :rows="6" />
        <div class="mt-1 flex gap-1">
          <BuilderButton size="xs" :label="translate('zx_builder_theme_apply_preview')" :disabled="!dirty" @click="apply" />
          <BuilderButton size="xs" :label="translate('zx_builder_theme_discard')" :disabled="!dirty" @click="discard" />
        </div>
        <p v-if="invalid" role="alert" class="text-utility-error">{{ translate('zx_builder_invalid_document') }}</p>
      </template>
    </div>
  </section>
</template>

<script>

  import { computed, defineComponent, ref, watch } from 'vue';
  import { useTranslation } from '../../composables/useTranslation.js';
  import { parseJson } from '../../../domain/validation.js';
  import { clone } from '../../../domain/nodes.js';
  
  export default defineComponent({
    props: { modelValue: { type: Object, required: true }, fields: { type: Array, default: () => [] }, open: { type: Boolean, default: true } },
    emits: ['apply', 'toggle'],
    setup(props, { emit }) {
      const mode = ref('fields');
      const tabs = [
        { id: 'fields', label: 'zx_builder_theme_props_fields', title: 'zx_builder_theme_preview_controls' },
        { id: 'json', label: 'zx_builder_theme_props_json', title: 'zx_builder_theme_preview_props' }
      ];
      const serialized = computed(() => JSON.stringify(props.modelValue, null, 2));
      const draft = ref(serialized.value);
      const dirty = computed(() => draft.value !== serialized.value);
      const invalid = ref(false);
      watch(serialized, (value, previous) => { if (draft.value === previous) draft.value = value; });
      function fieldOptions(field) {
        const options = field.options ?? [];
        const current = props.modelValue[field.key];
        return options.length && !options.some(option => Object.is(option.value, current))
          ? [...options, { value: current, label: String(current) }] : options;
      }
      function discard() { draft.value = serialized.value; invalid.value = false; }
      function changeField(key, value) {
        if (!dirty.value) emit('apply', { ...clone(props.modelValue), [key]: clone(value) });
      }
      function apply() {
        try {
          const value = parseJson(draft.value);
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
          draft.value = JSON.stringify(value, null, 2);
          emit('apply', value); invalid.value = false;
        } catch { invalid.value = true; }
      }
      return { ...useTranslation(), mode, tabs, draft, dirty, invalid, fieldOptions, discard, changeField, apply };
    }
  });

</script>
