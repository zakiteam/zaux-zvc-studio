<template>
  <dialog ref="dialog" class="w-[420px] max-w-[calc(100vw-32px)] rounded-s border-none bg-zaux-white p-4 font-builder text-zaux-dark shadow-deeper backdrop:bg-zaux-black/40"
    aria-labelledby="project-dialog-title" @cancel="cancel" @close="$emit('close')">
    <form @submit.prevent="submit">
      <h2 id="project-dialog-title" class="mb-2 text-[20px] font-medium">{{ translate(action === 'rename' ? 'zx_builder_rename_project' : 'zx_builder_delete_project') }}</h2>
      <label v-if="action === 'rename'" class="mb-3 block text-[12px]">
        <span class="mb-1 block">{{ translate('zx_builder_name') }}</span>
        <BuilderInput v-model="name" :label="translate('zx_builder_name')" required maxlength="100" :disabled="busy" class="w-full" />
      </label>
      <p v-else class="mb-3 text-[13px] leading-[1.6]">{{ translate('zx_builder_hub_delete_confirm', { name: project.name }) }}</p>
      <p v-if="error" role="alert" class="mb-2 text-[12px] text-utility-error">{{ translate(error) }}</p>
      <div class="flex justify-end gap-1.5">
        <BuilderButton :label="translate('zx_builder_cancel')" :disabled="busy" @click="dialog.close()" />
        <button type="submit" :disabled="busy || (action === 'rename' && !name.trim())"
          class="rounded-xxs bg-zaux-accent px-2 py-1.5 text-[12px] text-zaux-white disabled:opacity-50">
          {{ translate(busy ? 'zx_builder_loading' : action === 'rename' ? 'zx_builder_save' : 'zx_builder_delete') }}
        </button>
      </div>
    </form>
  </dialog>
</template>
<script>
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useTranslation } from '../../composables/useTranslation.js';
import BuilderInput from '../builder/BuilderInput.vue';
import BuilderButton from '../builder/BuilderButton.vue';
export default defineComponent({
  components: { BuilderInput, BuilderButton },
  props: { project: { type: Object, required: true }, action: String, busy: Boolean, error: String },
  emits: ['submit', 'close'],
  setup(props, { emit }) {
    const dialog = ref(null);
    const name = ref(props.project.name);
    let previousFocus;
    onMounted(() => {
      previousFocus = document.activeElement;
      dialog.value.showModal();
    });
    onBeforeUnmount(() => {
      dialog.value.close();
      const target = previousFocus?.isConnected ? previousFocus : document.querySelector('main h1');
      target?.focus();
    });
    function cancel(event) { if (props.busy) event.preventDefault(); }
    function submit() {
      if (props.busy || (props.action === 'rename' && (!name.value.trim() || name.value.trim().length > 100))) return;
      emit('submit', name.value.trim());
    }
    return { dialog, name, cancel, submit, ...useTranslation() };
  }
});
</script>
