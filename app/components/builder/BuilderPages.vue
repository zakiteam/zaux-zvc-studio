<template>
  <section class="shrink-0 border-b-slim border-zaux-light-grey" :aria-label="translate('zx_builder_templates')">
    <div class="flex h-[32px] items-center justify-between gap-1 pl-1 pr-0.5">
      <button type="button"
        class="flex min-w-0 items-center gap-0.5 rounded-xxs px-0.5 py-0.25 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey hover:text-zaux-dark focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
        :aria-expanded="open" aria-controls="zb-pages-list" @click="open = !open">
        <span aria-hidden="true" class="w-[12px] text-center">{{ open ? '▾' : '▸' }}</span>
        <span class="truncate">{{ translate('zx_builder_templates') }}</span>
        <span class="font-normal tracking-normal">{{ document.templates.length }}</span>
      </button>
      <div class="flex shrink-0 items-center [&>.zb-button]:!w-[26px] [&>.zb-button]:!min-w-[26px] [&>.zb-button]:!p-0.5">
        <BuilderButton size="xs" variant="alt1" icon="visualization-grid" iconOnly
          :label="translate('zx_builder_manage_templates')" :aria-pressed="templatesOpen"
          :extraProps="{ inheritedUIFlags: { HOVER: templatesOpen } }"
          :disabled="remoteProjectBusy" @click="templatesOpen = !templatesOpen" />
        <BuilderButton size="xs" variant="alt1" icon="plus" iconOnly :label="translate('zx_builder_new_template')"
          :disabled="!canEditRemote || remoteProjectBusy" @click="modal = { type: 'new-template' }" />
      </div>
    </div>
    <ul v-show="open" id="zb-pages-list" class="zb-scroll m-0 max-h-[168px] list-none overflow-auto px-0.5 pb-1">
      <li v-for="template in document.templates" :key="template.id"
        class="group/page flex min-w-0 items-center rounded-xxs"
        :class="template.id === activeTemplate.id ? (mode === 'template' ? 'bg-zaux-light' : 'bg-zaux-light/50') : 'hover:bg-zaux-light/60'">
        <button type="button"
          class="flex min-w-0 flex-1 items-center gap-1 rounded-xxs py-0.5 pl-1 pr-0.5 text-left text-[11px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          :class="template.id === activeTemplate.id ? 'font-semibold text-zaux-dark' : 'text-zaux-dark-grey'"
          :aria-current="template.id === activeTemplate.id ? 'page' : undefined"
          :title="translate('zx_builder_template_open') + ': ' + template.name"
          :disabled="remoteProjectBusy" @click="selectTemplate(template.id)">
          <span aria-hidden="true" class="w-[12px] shrink-0 text-center text-[10px]" :class="template.id === activeTemplate.id ? 'text-zaux-accent' : 'text-transparent'">✓</span>
          <span class="truncate">{{ template.name }}</span>
          <small class="ml-auto shrink-0 text-[9px] font-normal text-zaux-dark-grey">{{ template.instances.length }}</small>
        </button>
        <div class="flex shrink-0 items-center opacity-0 group-hover/page:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 [&>.zb-button]:!w-[24px] [&>.zb-button]:!min-w-[24px] [&>.zb-button]:!p-0.5">
          <BuilderButton size="xs" variant="alt1" icon="edit" iconOnly
            :label="translate('zx_builder_rename') + ': ' + template.name" :disabled="!canEditRemote || remoteProjectBusy"
            @click="modal = { type: 'rename', kind: 'template', id: template.id, name: template.name }" />
          <BuilderButton size="xs" variant="alt1" icon="duplicate" iconOnly
            :label="translate('zx_builder_duplicate') + ': ' + template.name" :disabled="!canEditRemote || remoteProjectBusy"
            @click="duplicate('template', template.id)" />
          <BuilderButton size="xs" variant="alt1" icon="delete" iconOnly
            :label="document.templates.length === 1 ? translate('zx_builder_last_template') : translate('zx_builder_delete') + ': ' + template.name"
            :disabled="!canEditRemote || remoteProjectBusy || document.templates.length === 1"
            @click="remove('template', template.id)" />
        </div>
      </li>
    </ul>
  </section>
</template>
<script>
import { defineComponent, ref } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import BuilderButton from './BuilderButton.vue';

// Compact template list for the Structure panel, like Figma's Pages section.
export default defineComponent({
  components: { BuilderButton },
  setup() {
    const builder = useBuilder();
    const open = ref(true);
    return { ...builder, open };
  }
});
</script>
