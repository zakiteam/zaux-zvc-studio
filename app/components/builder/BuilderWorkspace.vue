<template>
	<div
		v-if="workspaceReady"
		class="zb-app flex h-dvh flex-col overflow-hidden bg-zaux-light font-builder text-[13px] text-zaux-dark max-[900px]:h-auto max-[900px]:min-h-dvh max-[900px]:overflow-auto"
		:class="{ 'zb-app--preview': previewOnly }"
	>
		<BuilderHeader v-show="!previewOnly || !previewHeaderHidden || workspaceView !== 'design'" />
		<div
			v-if="recovery !== null || incoming || error || remoteConflict"
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
		<BuilderDialog v-if="modal" />
	</div>
  <main v-else class="grid h-screen p-4 min-h-dvh place-items-center bg-zaux-light font-builder text-zaux-dark">
    <div class="text-center">
      <p :role="error ? 'alert' : 'status'">{{ translate(error || 'zx_builder_loading') }}</p>
      <NuxtLink to="/" class="inline-block mt-2 underline text-zaux-accent">{{ translate('zx_builder_hub_back') }}</NuxtLink>
    </div>
  </main>
</template>
<script>
import { defineComponent, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { createBuilder } from '../../composables/useBuilder.js';
import { downloadText } from '../../services/files.js';
import BuilderHeader from './BuilderHeader.vue';
import BuilderDialog from './BuilderDialog.vue';
import BuilderDesignView from './BuilderDesignView.vue';
import BuilderThemeEditor from './BuilderThemeEditor.vue';
export default defineComponent({
  components: { BuilderHeader, BuilderDialog, BuilderDesignView, BuilderThemeEditor },
  props: { projectId: { type: String, default: null } },
  setup(props) {
    const builder = createBuilder({ projectId: props.projectId });
    const themesOpened = ref(false);
    watch(builder.workspaceView, view => { if (view === 'themes') themesOpened.value = true; });
    onBeforeRouteLeave(builder.prepareToLeave);
    onBeforeRouteUpdate(builder.prepareToLeave);
    return { ...builder, themesOpened, downloadRecovery: () => downloadText('zaux-recovery.json', builder.recovery.value ?? '') };
  }
});
</script>
