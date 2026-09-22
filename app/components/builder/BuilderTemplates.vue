<template>
  <section class="zb-scroll min-h-0 flex-1 overflow-auto bg-zaux-light p-3" :aria-label="translate('zx_builder_templates')">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-[16px] font-semibold">{{ translate('zx_builder_templates') }}</h2>
      <div class="flex flex-wrap gap-1">
        <BuilderButton size="xs" variant="alt1" :label="translate('zx_builder_back_template')" @click="selectTemplate(activeTemplate.id)" />
        <BuilderButton size="xs" icon="add" :label="translate('zx_builder_new_template')" :disabled="!canEditRemote || remoteProjectBusy" @click="modal = { type: 'new-template' }" />
      </div>
    </div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-2">
      <article v-for="template in document.templates" :key="template.id"
        class="flex min-w-0 flex-col overflow-hidden rounded-xxs border-slim bg-zaux-white"
        :class="template.id === activeTemplate.id ? 'border-zaux-accent' : 'border-zaux-light-grey'">
        <button type="button" class="flex flex-1 flex-col items-start gap-2 p-3 text-left hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          :aria-label="translate('zx_builder_template_open') + ': ' + template.name"
          :aria-current="template.id === activeTemplate.id ? 'true' : undefined"
          :disabled="remoteProjectBusy" @click="selectTemplate(template.id)">
          <span class="break-words text-[14px] font-semibold">{{ template.name }}</span>
          <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_template_blocks') }}: {{ template.instances.length }}</span>
          <span v-if="template.id === activeTemplate.id" class="text-[10px] font-medium text-zaux-accent">{{ translate('zx_builder_current_template') }}</span>
        </button>
        <div class="flex justify-end gap-1 border-t-slim border-zaux-light-grey p-1.5">
          <BuilderButton size="xs" variant="alt1" icon="edit" iconOnly
            :label="translate('zx_builder_rename') + ': ' + template.name" :disabled="!canEditRemote || remoteProjectBusy"
            @click="modal = { type: 'rename', kind: 'template', id: template.id, name: template.name }" />
          <BuilderButton size="xs" variant="alt1" icon="duplicate" iconOnly
            :label="translate('zx_builder_duplicate') + ': ' + template.name" :disabled="!canEditRemote || remoteProjectBusy"
            @click="duplicateTemplate(template.id)" />
          <BuilderButton size="xs" variant="alt1" icon="delete" iconOnly
            :label="translate('zx_builder_delete') + ': ' + template.name"
            :title="document.templates.length === 1 ? translate('zx_builder_last_template') : translate('zx_builder_delete') + ': ' + template.name"
            :disabled="!canEditRemote || remoteProjectBusy || document.templates.length === 1" @click="remove('template', template.id)" />
        </div>
      </article>
    </div>
  </section>
</template>
<script>
import { defineComponent } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderButton from './BuilderButton.vue';

export default defineComponent({
  components: { BuilderButton },
  setup() {
    const builder = useBuilder();
    function duplicateTemplate(id) {
      builder.duplicate('template', id);
      builder.templatesOpen.value = true;
    }
    return { ...builder, duplicateTemplate };
  }
});
</script>
