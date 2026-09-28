<template>
  <div class="shrink-0 border-b-slim border-zaux-light-grey px-2.5 py-2">
    <label class="mb-1 block text-[11px]">{{ translate('zx_builder_variant') }}</label>
    <div class="flex items-center gap-1">
      <BuilderInput class="min-w-0 flex-1 text-[11px]" type="select"
        :label="translate('zx_builder_variant')" :modelValue="activeDefinition.activeVariant ?? ''"
        :options="options" :disabled="!canEditRemote || !activeDefinition.variants"
        @update:modelValue="changeVariant" />
      <BuilderButton size="xs" icon="copy" iconOnly :label="translate('zx_builder_variant_create')"
        :disabled="!canEditRemote || (activeDefinition.variants?.length ?? 1) >= 50" @click="edit('create')" />
      <BuilderButton v-if="activeDefinition.variants" size="xs" icon="edit" iconOnly
        :label="translate('zx_builder_variant_rename')" :disabled="!canEditRemote" @click="edit('rename')" />
      <BuilderButton v-if="activeDefinition.variants" size="xs" icon="delete" iconOnly
        :label="translate('zx_builder_variant_delete')" :disabled="!canEditRemote || activeDefinition.variants.length < 2" @click="deleteActiveVariant" />
    </div>
    <form v-if="action" class="mt-2 grid gap-1" @submit.prevent="save">
      <BuilderInput v-model="name" :label="translate('zx_builder_variant_name')"
        :placeholder="translate('zx_builder_variant_name')" maxlength="80" required :disabled="!canEditRemote" />
      <div class="flex gap-1">
        <BuilderButton size="xs" :label="translate(action === 'create' ? 'zx_builder_variant_create' : 'zx_builder_apply')"
          :disabled="!canEditRemote || !name.trim()" @click="save" />
        <BuilderButton size="xs" variant="light" :label="translate('zx_builder_cancel')" @click="action = ''" />
      </div>
    </form>
    <p class="mt-1 text-[10px] leading-normal text-zaux-dark-grey">{{ translate(isSourceBase ? 'zx_builder_variant_source_hint' : 'zx_builder_variant_hint') }}</p>
  </div>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderInput from './fields/BuilderInput.vue';
import BuilderButton from './BuilderButton.vue';

export default defineComponent({
  components: { BuilderInput, BuilderButton },
  setup() {
    const builder = useBuilder();
    const action = ref('');
    const name = ref('');
    const options = computed(() => builder.activeDefinition.value.variants?.map(item => ({ value: item.id, label: item.name }))
      ?? [{ value: '', label: builder.translate('zx_builder_variant_base') }]);
    watch([() => builder.activeDefinition.value?.id, () => builder.activeDefinition.value?.activeVariant], () => { action.value = ''; });
    function edit(value) {
      action.value = value;
      name.value = value === 'rename' ? options.value.find(item => item.value === builder.activeDefinition.value.activeVariant)?.label ?? '' : '';
    }
    function save() {
      if (!action.value || !name.value.trim()) return;
      if (action.value === 'create') builder.createVariant(name.value);
      else builder.renameActiveVariant(name.value);
      if (!builder.error.value) action.value = '';
    }
    return { ...builder, action, name, options, edit, save };
  }
});
</script>
