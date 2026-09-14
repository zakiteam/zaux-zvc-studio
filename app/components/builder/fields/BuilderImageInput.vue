<template>
  <div>
    <BuilderInput :id="id" v-model="draft" :label="label" :disabled="disabled || !canEdit" @change="apply" />
    <BuilderButton class="mt-1" size="xs" :label="translate('zx_builder_media_library')" :disabled="disabled || !canEdit" @click="open = true" />
    <BuilderMediaPicker v-if="open" :projectId="projectId" :canManageProject="canEdit"
      @close="open = false" @select="select" />
  </div>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useBuilder } from '../../../composables/useBuilder.js';
import { useTranslation } from '../../../composables/useTranslation.js';
import BuilderInput from './BuilderInput.vue';
import BuilderButton from '../BuilderButton.vue';
import BuilderMediaPicker from '../BuilderMediaPicker.vue';

export default defineComponent({
  components: { BuilderInput, BuilderButton, BuilderMediaPicker },
  props: { modelValue: { default: '' }, id: String, label: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const builder = useBuilder();
    const open = ref(false);
    const draft = ref(props.modelValue ?? '');
    watch(() => props.modelValue, value => { draft.value = value ?? ''; });
    function apply() {
      if (!props.disabled && canEdit.value) emit('update:modelValue', draft.value);
    }
    const projectId = computed(() => builder?.activeRemoteProject.value?.id);
    const canEdit = computed(() => builder?.canEditRemote.value ?? true);
    function select(asset) {
      if (asset && !props.disabled && canEdit.value) emit('update:modelValue', asset.url);
      open.value = false;
    }
    return { ...useTranslation(), open, draft, apply, projectId, canEdit, select };
  }
});
</script>
