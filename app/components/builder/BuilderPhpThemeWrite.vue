<template>
	<!-- Writes a PHP export into a zaux-wp-project theme folder, after a confirmation with the file list. -->
	<BuilderButton
		v-if="supported"
		size="xs"
		variant="secondary"
		icon="folder"
		:extraProps="{ actionIcon: false }"
		:label="translate('zx_builder_php_theme_write')"
		:title="translate('zx_builder_php_theme_write_hint')"
		:disabled="disabled || busy || !count"
		@click="open"
	/>
	<span v-if="error && !theme" role="alert" class="text-[11px] text-utility-error">{{ translate(error) }}</span>
	<BuilderModal
		v-if="theme"
		:title="translate('zx_builder_php_theme_title')"
		:subtitle="theme.name"
		size="md"
		:busy="busy"
		@close="theme = null"
	>
		<p
			v-for="note in theme.notes"
			:key="note.key"
			:role="note.level === 'warning' ? 'alert' : undefined"
			class="mb-1 rounded-xs p-1.5 text-[11px] leading-[1.7]"
			:class="note.level === 'warning' ? 'bg-utility-warning/15' : 'bg-zaux-light text-zaux-dark-grey'"
		>
			{{ translate('zx_builder_php_theme_note_' + note.key) }}
		</p>
		<p class="mb-1 text-[11px] leading-[1.7] text-zaux-dark-grey">
			{{ translate('zx_builder_php_theme_summary', { added: theme.plan.added, changed: theme.plan.changed, unchanged: theme.plan.unchanged }) }}
		</p>
		<ul role="list" class="m-0 max-h-[320px] list-none overflow-auto rounded-xxs bg-zaux-light p-1 font-mono text-[10px] leading-[1.8]">
			<li v-for="entry in theme.plan.entries" :key="entry.path" class="flex min-w-0 items-center gap-1">
				<span class="shrink-0 rounded-xxs px-0.5 text-[9px] font-semibold uppercase"
					:class="entry.status === 'changed' ? 'bg-utility-warning/30 text-zaux-dark' : entry.status === 'added' ? 'bg-zaux-accent/15 text-zaux-accent' : 'bg-zaux-white text-zaux-dark-grey'">
					{{ translate('zx_builder_php_theme_status_' + entry.status) }}
				</span>
				<span class="truncate" :title="entry.path">{{ entry.path }}</span>
			</li>
		</ul>
		<p v-if="excludedReadme" class="mt-1 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_php_theme_readme') }}</p>
		<p v-if="error" role="alert" class="mt-1.5 rounded-xs bg-utility-error/10 p-1.5 text-[11px] text-utility-error">{{ translate(error) }}</p>
		<p v-if="written !== null" role="status" class="mt-1.5 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_php_theme_done', { count: written }) }}</p>
		<template #footer>
			<BuilderButton size="xs" variant="alt1" icon="folder" :label="translate('zx_builder_php_theme_change')" :disabled="busy" @click="change" />
			<BuilderButton
				size="xs"
				variant="primary"
				:label="translate('zx_builder_php_theme_confirm', { count: pending })"
				:disabled="busy || !pending"
				@click="write"
			/>
		</template>
	</BuilderModal>
</template>

<script>
	import { computed, defineComponent, ref } from "vue";
	import { useTranslation } from "../../composables/useTranslation.js";
	import { canWriteTheme, currentTheme, inspectTheme, pickThemeDirectory, writeTheme } from "../../services/php-theme.js";

	// Theme folder target for any PHP export (export dialog, Dev panel, PHP
	// conversion page). The chosen folder is remembered for the session only.
	export default defineComponent({
		name: "BuilderPhpThemeWrite",
		props: {
			// { path: text } of the PHP export.
			files: { type: Object, default: () => ({}) },
			disabled: Boolean,
		},
		setup(props) {
			const { translate } = useTranslation();
			const supported = canWriteTheme();
			const theme = ref(null);
			const busy = ref(false);
			const error = ref("");
			const written = ref(null);
			let handle = null;
			const count = computed(() => Object.keys(props.files ?? {}).length);
			const excludedReadme = computed(() => Object.hasOwn(props.files ?? {}, "README.md"));
			const pending = computed(() => theme.value ? theme.value.plan.added + theme.value.plan.changed : 0);
			const message = exception => typeof exception?.message === "string" && exception.message.startsWith("zx_") ? exception.message : "zx_builder_php_theme_error";
			async function inspect() {
				theme.value = await inspectTheme(handle, props.files);
			}
			async function choose() {
				handle = await pickThemeDirectory();
				written.value = null;
				await inspect();
			}
			async function run(task) {
				if (busy.value) return;
				busy.value = true; error.value = "";
				try { await task(); }
				catch (exception) { if (exception?.name !== "AbortError") error.value = message(exception); }
				finally { busy.value = false; }
			}
			function open() {
				return run(async () => {
					handle = currentTheme();
					written.value = null;
					if (handle) await inspect(); else await choose();
				});
			}
			const change = () => run(choose);
			function write() {
				return run(async () => {
					written.value = await writeTheme(handle, props.files, theme.value.plan);
					await inspect();
				});
			}
			return { translate, supported, theme, busy, error, written, count, excludedReadme, pending, open, change, write };
		},
	});
</script>
