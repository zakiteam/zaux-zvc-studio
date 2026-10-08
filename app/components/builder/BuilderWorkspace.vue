<template>
	<div
		v-if="workspaceReady"
		class="zb-app flex h-dvh flex-col overflow-hidden bg-zaux-light font-builder text-[13px] text-zaux-dark max-[900px]:h-auto max-[900px]:min-h-dvh max-[900px]:overflow-auto"
		:class="{ 'zb-app--preview': previewOnly }"
	>
		<BuilderHeader v-show="!previewOnly || !previewHeaderHidden || workspaceView !== 'design'" />
		<div
			v-if="recovery !== null || incoming || error || remoteConflict || saveStatus === 'global_conflict'"
			class="zb-notice flex items-center gap-2 bg-utility-warning/20 px-3 py-1.5 text-[11px] text-zaux-dark [&>span]:flex-1 [&_button]:underline"
			role="alert"
		>
			<template v-if="recovery !== null">
				<span>{{ translate("zx_builder_recovery") }}</span>
				<button @click="downloadRecovery">
					{{ translate("zx_builder_download_recovery") }}
				</button>
				<button @click="modal = { type: 'resume' }">
					{{ translate("zx_builder_resume_saving") }}
				</button>
			</template>
			<template v-else-if="incoming"
				><span>{{ translate("zx_builder_conflict") }}</span
				><button @click="resolveConflict(true)">
					{{ translate("zx_builder_use_remote") }}</button
				><button @click="resolveConflict(false)">
					{{ translate("zx_builder_keep_local") }}
				</button></template
			>
			<template v-else-if="saveStatus === 'global_conflict'"
				><span>{{ translate("zx_builder_global_conflict_notice") }}</span
				><button @click="reloadGlobalLibrary()">
					{{ translate("zx_builder_global_reload") }}
				</button></template
			>
			<template v-else-if="remoteConflict"
				><span>{{ translate("zx_builder_remote_conflict_notice") }}</span
				><button @click="openRemoteProject(activeRemoteProject.id)">
					{{ translate("zx_builder_reload_remote") }}
				</button></template
			>
			<template v-else
				><span>{{ translate(error) }}</span
				><button @click="error = ''">
					{{ translate("zx_builder_close") }}
				</button></template
			>
		</div>
		<BuilderDesignView v-show="workspaceView === 'design'" />
		<BuilderThemeEditor v-if="themesOpened" v-show="workspaceView === 'themes'" />
		<BuilderZauxVersionDialog v-if="modal?.type === 'zaux-version'" :key="modal.key ?? modal.id" />
		<BuilderGlobalDialog v-else-if="modal?.type?.startsWith('global-')" />
		<BuilderDialog v-else-if="modal" />
		<BuilderCmdPalette v-if="commandPaletteOpen" />
	</div>
  <main v-else class="grid h-screen p-4 min-h-dvh place-items-center bg-zaux-light font-builder text-zaux-dark">
    <div class="text-center">
      <p :role="error ? 'alert' : 'status'">{{ translate(error || 'zx_builder_loading') }}</p>
      <BuilderButton v-if="designer && error" class="mt-2" size="xs" :label="translate('zx_builder_hub_refresh')" @click="reloadGlobalLibrary()" />
      <NuxtLink to="/" class="inline-block mt-2 underline text-zaux-accent">{{ translate('zx_builder_hub_back') }}</NuxtLink>
    </div>
  </main>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useHead } from '#imports';
import { createBuilder } from '../../composables/useBuilder.js';
import { downloadText } from '../../services/files.js';
export default defineComponent({
  props: {
    projectId: { type: String, default: null },
    // Component designer: isolated editing of the shared global library.
    designer: { type: Boolean, default: false },
    designerComponentId: { type: String, default: null }
  },
  setup(props) {
    const builder = createBuilder({ projectId: props.projectId, designer: props.designer, designerComponentId: props.designerComponentId });
    const themesOpened = ref(false);
    watch(builder.workspaceView, view => { if (view === 'themes') themesOpened.value = true; });
    // Name the edited project in the browser tab; a remote project shows the bare title until it loads.
    const context = computed(() => props.designer ? builder.translate('zx_builder_global_designer')
      : builder.activeRemoteProject.value?.name || (props.projectId ? '' : builder.translate('zx_builder_title_local')));
    useHead(() => ({ title: context.value ? `${context.value} · Zaux Studio` : 'Zaux Studio' }));
    onBeforeRouteLeave(builder.prepareToLeave);
    onBeforeRouteUpdate(builder.prepareToLeave);
    return { ...builder, themesOpened, downloadRecovery: () => downloadText('zaux-recovery.json', builder.recovery.value ?? '') };
  }
});
</script>
