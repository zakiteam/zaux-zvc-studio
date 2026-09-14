<template>
  <div class="min-w-0 overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white text-zaux-dark shadow-sm focus-within:border-zaux-accent/50" @keydown.stop>
    <div class="flex flex-wrap items-center gap-1 border-b-slim border-zaux-light-grey bg-zaux-white p-1" role="group" :aria-label="translate('zx_builder_richtext_formatting')">
      <div v-for="(group, index) in groups" :key="index" class="flex gap-0.5 pr-1 last:pr-0" :class="index < groups.length - 1 ? 'border-r-slim border-zaux-light-grey' : ''">
        <BuilderButton v-for="action in group" :key="action.name" :icon="action.name" iconOnly :extraProps="iconProps" :label="translate(action.label)" :disabled="disabled || !available[action.name]" :aria-pressed="action.toggle ? !!active[action.name] : undefined" class="!h-[30px] !w-[30px] !min-w-[30px] !p-1 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-zaux-accent" :class="active[action.name] ? '[&.zb-button]:!bg-zaux-accent/10 [&.zb-button]:!text-zaux-accent' : ''" @mousedown.prevent @click="run(action)" />
      </div>
    </div>
    <div v-if="inTable" class="flex flex-wrap gap-0.5 border-b-slim border-zaux-light-grey bg-zaux-accent/5 p-1" role="group" :aria-label="translate('zx_builder_richtext_table_tools')">
      <BuilderButton v-for="action in tableActions" :key="action.name" :icon="action.name" iconOnly :extraProps="iconProps" :label="translate(action.label)" :disabled="disabled || !available[action.name]" class="!h-[30px] !w-[30px] !min-w-[30px] !p-1" :class="action.danger ? '[&.zb-button]:!text-utility-error' : ''" @mousedown.prevent @click="run(action)" />
    </div>
    <EditorContent :editor="editor" class="zb-richtext font-builder text-[12px] leading-[1.6]" />
  </div>
</template>
<script>
import { defineComponent, shallowRef, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { richTextContent, sanitizeRichText } from '../../../services/richtext.js';
import { useTranslation } from '../../../composables/useTranslation.js';
import BuilderButton from '../BuilderButton.vue';

export default defineComponent({
  components: { EditorContent, BuilderButton },
  props: { modelValue: { type: String, default: '' }, label: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const editor = shallowRef(null);
    const active = ref({}); const available = ref({}); const inTable = ref(false);
    const iconProps = { attributes: { icon: { iconSet: 'builder-richtext' } } };
    const action = (name, command, toggle = false, args = undefined, danger = false) => ({ name, command, toggle, args, danger, label: `zx_builder_richtext_${name}` });
    const groups = [
      [action('undo', 'undo'), action('redo', 'redo')],
      [action('bold', 'toggleBold', true), action('italic', 'toggleItalic', true), action('underline', 'toggleUnderline', true), action('strike', 'toggleStrike', true)],
      [action('h2', 'toggleHeading', true, { level: 2 }), action('h3', 'toggleHeading', true, { level: 3 }), action('blockquote', 'toggleBlockquote', true)],
      [action('bullets', 'toggleBulletList', true), action('numbers', 'toggleOrderedList', true), action('clear', 'unsetAllMarks')],
      [action('table', 'insertTable', false, { rows: 3, cols: 3, withHeaderRow: true })]
    ];
    const tableActions = [
      action('row_before', 'addRowBefore'), action('row_after', 'addRowAfter'),
      action('column_before', 'addColumnBefore'), action('column_after', 'addColumnAfter'),
      action('row_delete', 'deleteRow', false, undefined, true), action('column_delete', 'deleteColumn', false, undefined, true),
      action('header', 'toggleHeaderRow'), action('merge', 'mergeCells'), action('split', 'splitCell'),
      action('table_delete', 'deleteTable', false, undefined, true)
    ];
    function updateToolbar(instance) {
      const names = { bullets: 'bulletList', numbers: 'orderedList', h2: 'heading', h3: 'heading' };
      active.value = Object.fromEntries(groups.flat().filter(item => item.toggle).map(item => [item.name, instance.isActive(names[item.name] || item.name, item.args)]));
      available.value = Object.fromEntries([...groups.flat(), ...tableActions].map(item => [item.name, instance.can()[item.command](item.args)]));
      inTable.value = instance.isActive('table');
    }
    function attributes() {
      return { role: 'textbox', 'aria-multiline': 'true', 'aria-label': props.label || '', 'aria-disabled': String(props.disabled) };
    }
    function serializedContent(instance) {
      const html = sanitizeRichText(instance.getHTML());
      // Empty tables are authored structure, even when every cell has no text.
      return instance.isEmpty && !html.includes('<table') ? '' : html;
    }
    function mountEditor() {
      editor.value?.destroy();
      editor.value = new Editor({
        extensions: [StarterKit.configure({ link: false, heading: { levels: [2, 3] }, codeBlock: false, horizontalRule: false }), TableKit],
        content: richTextContent(props.modelValue),
        editable: !props.disabled,
        parseOptions: { preserveWhitespace: 'full' },
        editorProps: { attributes: attributes(), transformPastedHTML: sanitizeRichText },
        onTransaction: ({ editor: instance }) => updateToolbar(instance),
        onUpdate: ({ editor: instance }) => {
          if (!props.disabled) emit('update:modelValue', serializedContent(instance));
        }
      });
      updateToolbar(editor.value);
    }
    function run(action) {
      if (!props.disabled && editor.value) editor.value.chain().focus()[action.command](action.args).run();
    }
    onMounted(mountEditor);
    watch(() => props.modelValue, value => {
      if (!editor.value) return;
      const current = serializedContent(editor.value);
      // Reset local history when the parent restores or replaces the field value.
      if (current !== value) mountEditor();
    });
    watch(() => [props.disabled, props.label], () => {
      if (!editor.value) return;
      editor.value.setEditable(!props.disabled, false);
      editor.value.setOptions({ editorProps: { attributes: attributes(), transformPastedHTML: sanitizeRichText } });
    });
    onBeforeUnmount(() => editor.value?.destroy());
    return { ...useTranslation(), editor, groups, tableActions, iconProps, active, available, inTable, run };
  }
});
</script>
<style scoped>
.zb-richtext :deep(.tiptap) { min-height: 160px; max-height: 420px; overflow-y: auto; padding: 12px; outline: none; white-space: pre-wrap; overflow-wrap: anywhere; }
.zb-richtext :deep(.tiptap:focus) { box-shadow: inset 0 0 0 1px rgb(var(--zx-color-set1-accent)); }
.zb-richtext :deep(p) { margin: 0 0 0.5em; }
.zb-richtext :deep(p:last-child) { margin-bottom: 0; }
.zb-richtext :deep(ul) { list-style: disc; padding-left: 1.5em; }
.zb-richtext :deep(ol) { list-style: decimal; padding-left: 1.5em; }
.zb-richtext :deep(strong) { font-weight: 700; }
.zb-richtext :deep(em) { font-style: italic; }
.zb-richtext :deep(u) { text-decoration: underline; }
.zb-richtext :deep(blockquote) { border-left: 2px solid currentColor; padding-left: 0.75em; }
.zb-richtext :deep(h2) { font-size: 1.4em; font-weight: 650; margin: 0.75em 0 0.4em; }
.zb-richtext :deep(h3) { font-size: 1.15em; font-weight: 650; margin: 0.75em 0 0.4em; }
.zb-richtext :deep(s) { text-decoration: line-through; }
.zb-richtext :deep(table) { border-collapse: collapse; table-layout: fixed; width: 100%; min-width: 240px; margin: 12px 0; }
.zb-richtext :deep(td), .zb-richtext :deep(th) { border: 1px solid rgb(var(--zx-color-set1-dark) / 0.2); min-width: 48px; padding: 6px 8px; position: relative; vertical-align: top; }
.zb-richtext :deep(th) { background: rgb(var(--zx-color-set1-dark) / 0.05); font-weight: 650; text-align: left; }
.zb-richtext :deep(.selectedCell::after) { background: rgb(var(--zx-color-set1-accent) / 0.12); content: ''; position: absolute; inset: 0; pointer-events: none; }
.zb-richtext :deep(.tableWrapper) { overflow-x: auto; }
</style>
