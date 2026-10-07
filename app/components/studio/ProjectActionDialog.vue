<template>
  <BuilderModal :title="translate(action === 'rename' ? 'zx_builder_rename_project' : 'zx_builder_delete_project')" size="sm" :busy="busy"
    fallbackFocus="main h1" @close="$emit('close')">
    <form :id="formId" @submit.prevent="submit">
      <label v-if="action === 'rename'" class="block text-[12px]">
        <span class="mb-1 block">{{ translate('zx_builder_name') }}</span>
        <BuilderInput v-model="name" :label="translate('zx_builder_name')" required maxlength="100" :disabled="busy" class="w-full" />
      </label>
      <p v-else class="text-[13px] leading-[1.6]">{{ translate('zx_builder_hub_delete_confirm', { name: project.name }) }}</p>
      <p v-if="error" role="alert" class="mt-2 text-[12px] text-utility-error">{{ translate(error) }}</p>
    </form>
    <template #footer="{ close }">
      <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_cancel')" :disabled="busy" @click="close" />
      <BuilderButton size="xs" variant="primary" type="submit" :form="formId" :disabled="busy || (action === 'rename' && !name.trim())"
        :label="translate(busy ? 'zx_builder_loading' : action === 'rename' ? 'zx_builder_save' : 'zx_builder_delete')" />
    </template>
  </BuilderModal>
</template>
<script>
import { defineComponent, ref, useId } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderInput from '../builder/fields/BuilderInput.vue';
import BuilderButton from '../builder/BuilderButton.vue';
import BuilderModal from '../builder/BuilderModal.vue';
export default defineComponent({
  components: { BuilderInput, BuilderButton, BuilderModal },
  props: { project: { type: Object, required: true }, action: String, busy: Boolean, error: String },
  emits: ['submit', 'close'],
  setup(props, { emit }) {
    const name = ref(props.project.name);
    function submit() {
      if (props.busy || (props.action === 'rename' && (!name.value.trim() || name.value.trim().length > 100))) return;
      emit('submit', name.value.trim());
    }
    return { formId: useId(), name, submit, ...useTranslation() };
  }
});
</script>
