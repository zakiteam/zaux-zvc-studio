<template>
  <div class="shrink-0 border-b-slim border-zaux-light-grey px-1.5 py-1">
    <div class="flex items-center gap-0.5">
      <label :for="selectId" class="shrink-0 pr-0.5 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_variant') }}</label>
      <BuilderInput :id="selectId" class="min-w-0 flex-1 !py-0.5 text-[11px]" type="select"
        :label="translate('zx_builder_variant')" :modelValue="activeDefinition.activeVariant ?? ''"
        :options="options" :disabled="!canEditRemote || !activeDefinition.variants"
        @update:modelValue="changeVariant" />
      <div class="flex shrink-0 items-center [&>.zb-button]:!w-[26px] [&>.zb-button]:!min-w-[26px] [&>.zb-button]:!p-0.5">
        <BuilderButton size="xs" variant="alt1" icon="copy" iconOnly :label="translate('zx_builder_variant_create')"
          :disabled="!canEditRemote || (activeDefinition.variants?.length ?? 1) >= 50" @click="edit('create')" />
        <BuilderButton v-if="activeDefinition.variants" size="xs" variant="alt1" icon="edit" iconOnly
          :label="translate('zx_builder_variant_rename')" :disabled="!canEditRemote" @click="edit('rename')" />
        <BuilderButton v-if="activeDefinition.variants" size="xs" variant="alt1" icon="delete" iconOnly
          :label="translate('zx_builder_variant_delete')" :disabled="!canEditRemote || activeDefinition.variants.length < 2" @click="deleteActiveVariant" />
      </div>
      <span class="grid h-[24px] w-[18px] shrink-0 cursor-help place-items-center text-zaux-dark-grey" role="img"
        :title="translate(isSourceBase ? 'zx_builder_variant_source_hint' : 'zx_builder_variant_hint')"
        :aria-label="translate(isSourceBase ? 'zx_builder_variant_source_hint' : 'zx_builder_variant_hint')">
        <Icon iconName="info" size="text-icon-xxs" aria-hidden="true" />
      </span>
    </div>
    <form v-if="action" class="mt-1 grid gap-1" @submit.prevent="save">
      <BuilderInput v-model="name" :label="translate('zx_builder_variant_name')"
        :placeholder="translate('zx_builder_variant_name')" maxlength="80" required :disabled="!canEditRemote" />
      <div class="flex gap-1">
        <BuilderButton size="xs" :label="translate(action === 'create' ? 'zx_builder_variant_create' : 'zx_builder_apply')"
          :disabled="!canEditRemote || !name.trim()" @click="save" />
        <BuilderButton size="xs" variant="light" :label="translate('zx_builder_cancel')" @click="action = ''" />
      </div>
    </form>
  </div>
</template>
<script>
import { computed, defineComponent, ref, useId, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderInput from './fields/BuilderInput.vue';
import BuilderButton from './BuilderButton.vue';

export default defineComponent({
  components: { BuilderInput, BuilderButton },
  setup() {
    const builder = useBuilder();
    const selectId = useId();
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
    return { ...builder, selectId, action, name, options, edit, save };
  }
});
</script>
