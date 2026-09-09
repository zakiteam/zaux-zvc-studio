<template>
  <div ref="host" class="min-w-0 overflow-hidden rounded-xxs border-slim border-zaux-light-grey bg-zaux-light text-zaux-dark focus-within:outline focus-within:outline-2 focus-within:outline-zaux-accent" />
</template>
<script>
import { defineComponent, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
export default defineComponent({
  props: { modelValue: { type: String, default: '' }, language: { default: 'json' }, label: String, readonly: Boolean, disabled: Boolean, rows: { default: 12 } },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const host = ref(null);
    const configuration = new Compartment();
    let view; let external = false; let lastCommitted = props.modelValue;
    function extensions() {
      const locked = props.readonly || props.disabled;
      return [
        props.language === 'css' ? css() : props.language === 'javascript' ? javascript() : json(),
        EditorState.readOnly.of(locked), EditorView.editable.of(!locked),
        EditorView.contentAttributes.of({ 'aria-label': props.label || props.language, 'aria-disabled': String(props.disabled), tabindex: '0' }),
        EditorView.theme({
          '&': { fontSize: '12px', color: 'inherit', backgroundColor: 'transparent' },
          '.cm-scroller': { fontFamily: 'monospace', overflow: 'auto', maxHeight: '65vh', minHeight: (Number(props.rows) * 20) + 'px' },
          '.cm-content': { padding: '8px 0' },
          '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
          '&.cm-focused': { outline: 'none' }
        })
      ];
    }
    onMounted(() => {
      view = new EditorView({ parent: host.value, state: EditorState.create({ doc: props.modelValue, extensions: [basicSetup, configuration.of(extensions()),
        EditorView.updateListener.of(update => { if (update.docChanged && !external) emit('update:modelValue', update.state.doc.toString()); }),
        EditorView.domEventHandlers({ blur: () => {
          const value = view.state.doc.toString();
          if (!props.readonly && !props.disabled && value !== lastCommitted) { lastCommitted = value; emit('change', value); }
        } })
      ] }) });
    });
    watch(() => props.modelValue, value => {
      if (!view || view.state.doc.toString() === value) return;
      external = true;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value }, annotations: Transaction.addToHistory.of(false) });
      lastCommitted = value; external = false;
    });
    watch(() => [props.language, props.readonly, props.disabled, props.label, props.rows], () => { if (view) view.dispatch({ effects: configuration.reconfigure(extensions()) }); });
    onBeforeUnmount(() => view?.destroy());
    return { host };
  }
});
</script>
