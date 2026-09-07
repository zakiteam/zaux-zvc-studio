<template>
  <div class="zb-app flex h-dvh flex-col overflow-hidden bg-zaux-light font-main text-[13px] text-zaux-dark max-[900px]:h-auto max-[900px]:min-h-dvh max-[900px]:overflow-auto" :class="{ 'zb-app--preview': previewOnly }">
    <header class="zb-topbar flex h-[70px] min-h-[70px] items-center gap-3 border-b-slim border-zaux-light-grey bg-zaux-white px-2 max-[900px]:justify-between max-[900px]:px-1.5">
      <a href="/" class="flex flex-wrap gap-2" aria-label="Zaux Studio">
        <img class="w-4" src="/assets/builder/logo-studio.svg"/>
        <div class="flex flex-col justify-center gap-2">
          <span>Zaux <strong>Studio</strong></span>
        </div>
      </a>
      <div class="zb-breadcrumb flex min-w-0 flex-1 items-center gap-1.5 text-[12px] [&>span]:text-zaux-dark-grey [&>strong]:truncate [&>strong]:font-medium max-[900px]:hidden"><span>{{ translate('zx_builder_local') }}</span><span>/</span><strong>{{ mode === 'library' ? activeDefinition?.name : activeTemplate.name }}</strong><span class="zb-badge inline-block rounded-xxs bg-zaux-light px-0.75 py-0.25 font-mono text-[10px] tracking-[0.8px] text-zaux-dark-grey">{{ mode === 'library' ? 'ZVC' : 'ZVT' }}</span></div>
      <div class="zb-top-actions flex items-center gap-1 max-[900px]:gap-0 max-[900px]:[&>.zb-button:nth-of-type(-n+2)]:hidden">
        <BuilderInput v-if="remoteProjects.length" class="!w-[150px] max-[1200px]:!w-[110px]" type="select" :modelValue="activeRemoteProject?.id ?? ''" :label="translate('zx_builder_projects')" :options="[{ value: '', label: translate('zx_builder_projects') }, ...remoteProjects.map(project => ({ value: project.id, label: project.name }))]" @update:modelValue="chooseProject" />
        <BuilderButton :label="translate('zx_builder_new_project')" icon="add" @click="modal = { type: 'new-project' }" />
        <BuilderButton v-if="activeRemoteProject" :label="translate('zx_builder_save_remote')" icon="upload" @click="flushRemoteSave(true)" />
        <span v-if="activeRemoteProject" class="text-[10px] text-zaux-dark-grey max-[1200px]:hidden">{{ translate(`zx_builder_remote_${remoteSaveStatus}`) }}</span>
        <span class="zb-save-status mr-1.5 flex max-w-[240px] items-center gap-0.75 text-[11px] text-zaux-dark-grey [&>i]:h-[6px] [&>i]:w-[6px] [&>i]:shrink-0 [&>i]:rounded-full [&>i]:bg-utility-success [&.is-error]:text-utility-error max-[1200px]:hidden" :class="{ 'is-error': saveStatus === 'storage_error' }" role="status"><i></i>{{ translate(`zx_builder_${saveStatus}`) }}</span>
        <BuilderButton icon="undo" iconOnly :label="translate('zx_builder_undo')" :disabled="!undoStack.length" @click="undo" />
        <BuilderButton icon="redo" iconOnly :label="translate('zx_builder_redo')" :disabled="!redoStack.length" @click="redo" />
        <span class="zb-divider mx-1 h-[24px] w-[1px] bg-zaux-light-grey max-[900px]:hidden"></span>
        <BuilderButton icon="customize" :label="translate('zx_builder_style_settings')" :aria-pressed="stylesOpen" @click="stylesOpen = !stylesOpen; previewOnly = false" />
        <BuilderButton :label="translate('zx_builder_import')" @click="modal = { type: 'import' }" />
        <BuilderButton variant="primary" :label="translate('zx_builder_export')" icon="arrow-up-right" @click="modal = { type: 'export' }" />
        <span class="max-w-[130px] truncate text-[10px] text-zaux-dark-grey max-[1200px]:hidden">{{ user?.email }}</span><BuilderButton icon="close" iconOnly :label="translate('zx_builder_logout')" @click="signOut" />
      </div>
    </header>
    <div v-if="recovery !== null || incoming || error || remoteConflict" class="zb-notice flex items-center gap-2 bg-utility-warning/20 px-3 py-1.5 text-[11px] text-zaux-dark [&>span]:flex-1 [&_button]:underline" role="alert">
      <template v-if="recovery !== null">
        <span>{{ translate('zx_builder_recovery') }}</span>
        <button @click="downloadRecovery">{{ translate('zx_builder_download_recovery') }}</button>
        <button @click="modal = { type: 'resume' }">{{ translate('zx_builder_resume_saving') }}</button>
      </template>
      <template v-else-if="incoming"><span>{{ translate('zx_builder_conflict') }}</span><button @click="resolveConflict(true)">{{ translate('zx_builder_use_remote') }}</button><button @click="resolveConflict(false)">{{ translate('zx_builder_keep_local') }}</button></template>
      <template v-else-if="remoteConflict"><span>{{ translate('zx_builder_remote_conflict_notice') }}</span><button @click="openRemoteProject(activeRemoteProject.id)">{{ translate('zx_builder_reload_remote') }}</button></template>
      <template v-else><span>{{ translate(error) }}</span><button @click="error = ''">{{ translate('zx_builder_close') }}</button></template>
    </div>
    <div class="zb-workbench flex min-h-0 flex-1 max-[900px]:flex-wrap">
      <BuilderSidebar v-show="!previewOnly" :width="leftWidth" /><BuilderResizeHandle v-if="!previewOnly" side="left" :label="translate('zx_builder_resize_left')" @resize="resizePanel('left', $event)" />
      <main class="zb-main flex min-w-0 flex-1 flex-col max-[900px]:h-[80dvh] max-[900px]:w-[calc(100%_-_210px)]">
        <div class="zb-canvas-toolbar flex h-[72px] min-h-[72px] items-center justify-between gap-1.5 border-b-slim border-zaux-light-grey bg-zaux-white px-3 max-[1200px]:px-2">
          <div class="zb-canvas-label min-w-[80px] [&>strong]:mt-0.75 [&>strong]:block [&>strong]:max-w-[200px] [&>strong]:truncate [&>strong]:text-[14px] [&>strong]:font-medium max-[900px]:hidden"><span class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate(mode === 'library' ? 'zx_builder_library' : 'zx_builder_templates') }}</span><strong>{{ mode === 'library' ? activeDefinition?.name : activeTemplate.name }}</strong></div>
          <div class="zb-device-switch flex rounded-xs border-slim border-zaux-light-grey bg-zaux-light p-0.5 [&>button]:rounded-xxs [&>button]:px-1.5 [&>button]:py-1 [&>button]:text-[10px] [&>button]:text-zaux-dark-grey [&>button.active]:bg-zaux-white [&>button.active]:text-zaux-accent [&>button.active]:shadow-closer max-[1200px]:[&>button]:px-1" :aria-label="translate('zx_builder_preview')">
            <button v-for="device in ['desktop', 'tablet', 'mobile']" :key="device" :class="{ active: viewport === device }" :aria-pressed="viewport === device" @click="viewport = device">{{ translate(`zx_builder_${device}`) }}</button>
          </div>
          <BuilderButton :label="translate(previewOnly ? 'zx_builder_design' : 'zx_builder_preview')" :icon="previewOnly ? 'edit' : 'visibility'" @click="previewOnly = !previewOnly" />
        </div>
        <div v-if="mode === 'library'" class="zb-context-line flex justify-between gap-1.5 bg-zaux-accent/5 px-3 py-1.5 text-[10px] text-zaux-dark-grey [&>button]:whitespace-nowrap [&>button]:text-zaux-accent [&>button]:underline"><span>{{ translate('zx_builder_library_notice') }}</span><button @click="selectTemplate(activeTemplate.id)">{{ translate('zx_builder_back_template') }} ↗</button></div>
        <BuilderCanvas />
        <footer class="zb-canvas-footer flex items-center justify-between gap-3 border-t-slim border-zaux-light-grey bg-zaux-white px-3 py-1.5 text-[9px] leading-[1.5] text-zaux-dark-grey [&>span:last-child]:whitespace-nowrap max-[1200px]:[&>span:last-child]:hidden max-[900px]:hidden"><span>{{ previewOnly ? translate('zx_builder_preview_interaction') : translate('zx_builder_drag_hint') }}</span><span>{{ translate('zx_builder_readonly_source') }}</span></footer>
      </main>
      <BuilderResizeHandle v-if="!previewOnly" side="right" :label="translate('zx_builder_resize_right')" @resize="resizePanel('right', $event)" /><BuilderStyles v-if="stylesOpen && !previewOnly" :width="rightWidth" /><BuilderInspector v-show="!previewOnly && !stylesOpen" :width="rightWidth" />
    </div>
    <BuilderDialog v-if="modal" />
  </div>
</template>
<script>
import { defineComponent, ref } from 'vue';
import { createBuilder } from '../../composables/useBuilder.js';
import { downloadText } from '../../services/files.js';
import BuilderButton from './BuilderButton.vue';
import BuilderSidebar from './BuilderSidebar.vue';
import BuilderCanvas from './BuilderCanvas.vue';
import BuilderInspector from './BuilderInspector.vue';
import BuilderDialog from './BuilderDialog.vue';
import BuilderStyles from './BuilderStyles.vue';
import BuilderResizeHandle from './BuilderResizeHandle.vue';
import BuilderInput from './BuilderInput.vue';
import { useAuth } from '../../composables/useAuth.js';
export default defineComponent({
  components: { BuilderButton, BuilderSidebar, BuilderCanvas, BuilderInspector, BuilderDialog, BuilderStyles, BuilderResizeHandle, BuilderInput },
  setup() {
    const builder = createBuilder();
    const auth = useAuth();
    const leftWidth = ref(254); const rightWidth = ref(298);
    function resizePanel(side, delta) { const target = side === 'left' ? leftWidth : rightWidth; target.value = Math.min(side === 'left' ? 420 : 520, Math.max(side === 'left' ? 210 : 260, target.value + delta)); }
    async function chooseProject(id) { if (id) await builder.openRemoteProject(id); }
    return { ...builder, ...auth, leftWidth, rightWidth, resizePanel, chooseProject, downloadRecovery: () => downloadText('zaux-recovery.json', builder.recovery.value ?? '') };
  }
});
</script>
