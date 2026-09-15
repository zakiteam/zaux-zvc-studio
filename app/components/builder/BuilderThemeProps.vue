<template>
  <details class="max-h-[45vh] shrink-0 overflow-auto border-t-slim border-zaux-light-grey bg-zaux-white p-2" open>
    <summary class="cursor-pointer">{{ translate('zx_builder_theme_preview_controls') }}</summary>
    <div class="flex gap-1 my-2">
      <BuilderButton size="xs" :label="translate('zx_builder_theme_preview_controls')" :aria-pressed="mode === 'fields'" @click="mode = 'fields'" />
      <BuilderButton size="xs" :label="translate('zx_builder_theme_preview_props')" :aria-pressed="mode === 'json'" @click="mode = 'json'" />
    </div>
    <template v-if="mode === 'fields'">
      <p v-if="dirty" role="status" class="mb-2 text-[11px]">{{ translate('zx_builder_theme_props_pending') }}</p>
      <p v-if="!fields.length" class="text-[11px]">{{ translate('zx_builder_theme_props_empty') }}</p>
      <fieldset :disabled="dirty" class="grid min-w-0 grid-cols-1 gap-2 p-0 border-none md:grid-cols-2">
        <div v-for="field in fields" :key="field.key" :class="['json', 'textarea'].includes(field.type) ? 'md:col-span-2' : ''">
          <p class="mb-1 font-mono text-[11px]">{{ field.key }}</p>
          <BuilderValue :modelValue="modelValue[field.key]" :type="field.type" :label="field.key" :options="fieldOptions(field)" :disabled="dirty"
            @update:modelValue="changeField(field.key, $event)" />
        </div>
      </fieldset>
    </template>
    <template v-else>
      <BuilderCodeEditor v-model="draft" :label="translate('zx_builder_theme_preview_props')" :rows="6" />
      <div class="flex gap-1 mt-1">
        <BuilderButton size="xs" :label="translate('zx_builder_theme_apply_preview')" :disabled="!dirty" @click="apply" />
        <BuilderButton size="xs" :label="translate('zx_builder_theme_discard')" :disabled="!dirty" @click="discard" />
      </div>
      <p v-if="invalid" role="alert" class="text-utility-error">{{ translate('zx_builder_invalid_document') }}</p>
    </template>
  </details>
</template>

<script>

  import { computed, defineComponent, ref, watch } from 'vue';
  import { useTranslation } from '../../composables/useTranslation.js';
  import { parseJson } from '../../../domain/validation.js';
  import { clone } from '../../../domain/nodes.js';
  import BuilderButton from './BuilderButton.vue';
  import BuilderCodeEditor from './fields/BuilderCodeEditor.vue';
  import BuilderValue from './fields/BuilderValue.vue';
  
  export default defineComponent({
    components: { BuilderButton, BuilderCodeEditor, BuilderValue },
    props: { modelValue: { type: Object, required: true }, fields: { type: Array, default: () => [] } },
    emits: ['apply'],
    setup(props, { emit }) {
      const mode = ref('fields');
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
      return { ...useTranslation(), mode, draft, dirty, invalid, fieldOptions, discard, changeField, apply };
    }
  });

</script>
