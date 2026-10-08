<template>
	<div class="min-w-0">
		<Teleport to="body">
			<BuilderModal :open="expanded" :title="label || translate('zx_builder_code_expanded')" :subtitle="language"
				size="full" height="screen" bodyClass="flex flex-col p-2" :initialFocus="false"
				@close="closeExpanded" @keyup.stop>
				<div ref="expandedHost" class="flex-1 min-h-0" />
			</BuilderModal>
		</Teleport>
		<Teleport :to="expandedHost || 'body'" :disabled="!expanded">
			<div :class="{ 'zb-code-expanded flex h-full min-h-0 flex-col': fillMode }" @keydown="editorKeydown" @keyup="editorKeydown" class="min-w-0 overflow-hidden rounded-xxs border-slim border-zaux-light-grey focus-within:outline focus-within:outline-2 focus-within:outline-zaux-accent">
				<div class="flex items-center justify-end gap-1 p-1 shrink-0 border-b-slim border-zaux-light-grey bg-zaux-white">
					<BuilderButton size="xs" variant="secondary" icon="sort"
						:label="translate('zx_builder_format_code')"
						:disabled="disabled || formatting || !modelValue.trim()"
						:aria-busy="formatting"
						@mousedown.prevent
						@click="format" />
					<BuilderButton v-show="!expanded" size="xs" variant="secondary"
						:label="translate('zx_builder_code_expand')" :disabled="disabled"
						aria-haspopup="dialog" @click="openExpanded" />
				</div>
				<p v-if="formatError" role="alert" class="border-b-slim border-zaux-light-grey p-2 text-[11px] text-utility-error">
					{{ translate('zx_builder_format_code_error') }}
				</p>
				<div ref="host" :class="{ 'min-h-0 flex-1': fillMode }" />
			</div>
		</Teleport>
	</div>
</template>
<script>

	import { computed, defineComponent, ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
	import { basicSetup } from "codemirror";
	import { oneDark } from "@codemirror/theme-one-dark";
	import { EditorState, Compartment, Transaction } from "@codemirror/state";
	import { EditorView } from "@codemirror/view";
	import { json } from "@codemirror/lang-json";
	import { css } from "@codemirror/lang-css";
	import { html } from "@codemirror/lang-html";
	import { javascript } from "@codemirror/lang-javascript";
	import { useTranslation } from '../../../composables/useTranslation.js';
	import { formatCode } from '../../../../domain/format-code.js';

	export default defineComponent({
		props: {
			modelValue: { type: String, default: "" },
			language: { default: "json" },
			label: String,
			readonly: Boolean,
			disabled: Boolean,
			rows: { default: 12 },
			fill: Boolean,
		},
		emits: ["update:modelValue", "change"],
		setup(props, { emit }) {
			const host = ref(null);
			const expandedHost = ref(null);
			const expanded = ref(false);
			const fillMode = computed(() => props.fill || expanded.value);
			let previousFocus;
			async function openExpanded() {
				if (props.disabled || expanded.value) return;
				previousFocus = document.activeElement;
				expanded.value = true;
				await nextTick();
				view?.requestMeasure();
				view?.focus();
			}
			async function closeExpanded() {
				if (!expanded.value) return;
				commit();
				expanded.value = false;
				await nextTick();
				view?.requestMeasure();
				if (previousFocus?.isConnected) previousFocus.focus();
			}
			function editorKeydown(event) {
				// Teleported content must not trigger shortcuts in a containing builder dialog.
				if (expanded.value) event.stopPropagation();
			}
			const { translate } = useTranslation();
			const formatting = ref(false);
			const formatError = ref(false);
			let revision = 0;
			const configuration = new Compartment();
			let view;
			let external = false;
			let lastCommitted = props.modelValue;
			function commit() {
				if (!view || props.readonly || props.disabled) return;
				const value = view.state.doc.toString();
				if (value !== lastCommitted) {
					lastCommitted = value;
					emit('change', value);
				}
			}
			async function format() {
				if (!view || props.disabled || formatting.value) return;
				const source = view.state.doc.toString();
				if (!source.trim()) return;
				const currentRevision = revision;
				formatting.value = true;
				formatError.value = false;
				try {
					const { formatted, cursorOffset } = await formatCode(source, props.language, view.state.selection.main.head);
					if (!view || revision !== currentRevision || props.disabled) return;
					if (formatted !== source) {
						view.dispatch({
							changes: { from: 0, to: view.state.doc.length, insert: formatted },
							selection: { anchor: Math.max(0, Math.min(cursorOffset, formatted.length)) },
							annotations: Transaction.userEvent.of('input.format'),
						});
						lastCommitted = formatted;
						emit('change', formatted);
					}
					view.focus();
				} catch {
					if (view && revision === currentRevision) formatError.value = true;
				} finally {
					formatting.value = false;
				}
			}
			function extensions() {
				const locked = props.readonly || props.disabled;
				return [
					props.language === "html" || props.language === "vue"
						? html()
						: props.language === "css"
							? css()
							: props.language === "javascript"
								? javascript()
								: json(),
					EditorState.readOnly.of(locked),
					EditorView.editable.of(!locked),
					EditorView.contentAttributes.of({
						"aria-label": props.label || props.language,
						"aria-disabled": String(props.disabled),
						tabindex: "0",
					}),
					EditorView.theme({
						"&": {
							fontSize: "12px",
						},
						".cm-scroller": {
							fontFamily: "monospace",
							overflow: "auto",
							maxHeight: "65vh",
							minHeight: Number(props.rows) * 20 + "px",
						},
						".cm-content": { padding: "8px 0" },
						".cm-gutters": { border: "none" },
						"&.cm-focused": { outline: "none" },
					}),
				];
			}
			onMounted(() => {
				view = new EditorView({
					parent: host.value,
					state: EditorState.create({
						doc: props.modelValue,
						extensions: [
							basicSetup,
							oneDark,
							configuration.of(extensions()),
							EditorView.updateListener.of((update) => {
								if (update.docChanged) {
									revision++;
									formatError.value = false;
									if (!external) emit("update:modelValue", update.state.doc.toString());
								}
							}),
							EditorView.domEventHandlers({
								blur: commit,
							}),
						],
					}),
				});
			});
			watch(
				() => props.modelValue,
				(value) => {
					if (!view || view.state.doc.toString() === value) return;
					external = true;
					view.dispatch({
						changes: { from: 0, to: view.state.doc.length, insert: value },
						annotations: Transaction.addToHistory.of(false),
					});
					lastCommitted = value;
					external = false;
				},
			);
			watch(
				() => [
					props.language,
					props.readonly,
					props.disabled,
					props.label,
					props.rows,
				],
				() => {
					revision++;
					formatError.value = false;
					if (view)
						view.dispatch({ effects: configuration.reconfigure(extensions()) });
				},
			);
			onBeforeUnmount(() => {
				revision++;
				view?.destroy();
				view = null;
			});
			return { host, expandedHost, expanded, fillMode, openExpanded, closeExpanded, editorKeydown, translate, formatting, formatError, format };
		},
	});
	
</script>

<style scoped>
.zb-code-expanded :deep(.cm-editor) {
	height: 100%;
}
.zb-code-expanded :deep(.cm-scroller) {
	min-height: 0 !important;
	max-height: none !important;
}
</style>
