<template>
  <BuilderModal :title="translate(TITLES[action])" size="sm" :busy="busy"
    fallbackFocus="main h1" @close="$emit('close')">
    <form :id="formId" @submit.prevent="submit">
      <label v-if="named" class="block text-[12px]">
        <span class="mb-1 block">{{ translate('zx_builder_name') }}</span>
        <BuilderInput v-model="name" :label="translate('zx_builder_name')" required maxlength="100" :disabled="busy" class="w-full" />
      </label>
      <p v-if="action === 'create'" class="mt-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_hub_new_hint') }}</p>
      <p v-if="action === 'delete'" class="text-[13px] leading-[1.6]">{{ translate('zx_builder_hub_delete_confirm', { name: project.name }) }}</p>
      <p v-if="error" role="alert" class="mt-2 text-[12px] text-utility-error">{{ translate(error) }}</p>
    </form>
    <template #footer="{ close }">
      <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_cancel')" :disabled="busy" @click="close" />
      <BuilderButton size="xs" variant="primary" type="submit" :form="formId" :disabled="busy || (named && !name.trim())"
        :label="translate(busy ? 'zx_builder_loading' : SUBMIT_LABELS[action])" />
    </template>
  </BuilderModal>
</template>
<script>
import { computed, defineComponent, ref, useId } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
const TITLES = { create: 'zx_builder_new_project', rename: 'zx_builder_rename_project', delete: 'zx_builder_delete_project' };
const SUBMIT_LABELS = { create: 'zx_builder_create', rename: 'zx_builder_save', delete: 'zx_builder_delete' };
export default defineComponent({
  props: { project: { type: Object, required: true }, action: String, busy: Boolean, error: String },
  emits: ['submit', 'close'],
  setup(props, { emit }) {
    const name = ref(props.project.name ?? '');
    const named = computed(() => props.action !== 'delete');
    function submit() {
      if (props.busy || (named.value && (!name.value.trim() || name.value.trim().length > 100))) return;
      emit('submit', name.value.trim());
    }
    return { TITLES, SUBMIT_LABELS, formId: useId(), name, named, submit, ...useTranslation() };
  }
});
</script>
