<template>
  <div class="min-w-0">
    <Teleport to="body">
      <BuilderModal :open="expanded" :title="label || translate('zx_builder_richtext_expanded')" :subtitle="translate('zx_builder_richtext')"
        size="full" height="screen" bodyClass="flex flex-col p-2" :initialFocus="false"
        @close="closeExpanded" @keyup.stop>
        <div ref="expandedHost" class="flex min-h-0 flex-1 flex-col" />
      </BuilderModal>
    </Teleport>
    <Teleport :to="expandedHost || 'body'" :disabled="!expanded">
      <div
        class="min-w-0 overflow-hidden rounded-xs border-slim border-zaux-light-grey bg-zaux-white text-zaux-dark shadow-sm focus-within:border-zaux-accent/50"
        :class="{ 'flex min-h-0 flex-1 flex-col': expanded }"
        @keydown.stop
      >
        <!-- Segmented groups, styled like the Style tab quickpad. -->
        <div class="flex flex-wrap items-center gap-1 border-b-slim border-zaux-light-grey bg-zaux-white p-1" role="toolbar" :aria-label="translate('zx_builder_richtext_formatting')">
          <div class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <button v-for="item in history" :key="item.name" v-bind="buttonAttrs(item)" @mousedown.prevent @click="run(item)">
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon(item.name)" />
            </button>
          </div>
          <div class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <BuilderDropdown
              :label="translate('zx_builder_richtext_block_type')"
              :items="blockItems"
              :disabled="disabled"
              @select="setBlock($event.id)"
            >
              <template #trigger="{ open, menuId }">
                <button
                  type="button"
                  :disabled="disabled"
                  :title="translate('zx_builder_richtext_block_type')"
                  :aria-label="translate('zx_builder_richtext_block_type') + ': ' + translate(blockLabel(blockType))"
                  aria-haspopup="menu"
                  :aria-expanded="open"
                  :aria-controls="menuId"
                  class="flex h-[26px] min-w-[44px] items-center justify-between gap-0.25 rounded-xxs pl-1 pr-0.25 text-[11px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zaux-accent disabled:opacity-40"
                  :class="blockType !== 'paragraph' ? 'bg-zaux-white text-zaux-accent shadow-sm' : 'text-zaux-dark-grey hover:bg-zaux-white/70 hover:text-zaux-dark'"
                  @mousedown.prevent
                >
                  <span>{{ blockType === 'paragraph' ? '¶' : blockType.toUpperCase() }}</span>
                  <span aria-hidden="true" class="block h-[12px] w-[12px]" :style="maskIcon('chevron')" />
                </button>
              </template>
            </BuilderDropdown>
            <button v-bind="buttonAttrs(blockquote)" @mousedown.prevent @click="run(blockquote)">
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon(blockquote.name)" />
            </button>
          </div>
          <div class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <button v-for="item in marks" :key="item.name" v-bind="buttonAttrs(item)" @mousedown.prevent @click="run(item)">
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon(item.name)" />
            </button>
            <button
              v-bind="buttonAttrs(linkAction)"
              :aria-expanded="linkOpen"
              @mousedown.prevent
              @click="toggleLink"
            >
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon('link')" />
            </button>
          </div>
          <div class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <button v-for="item in lists" :key="item.name" v-bind="buttonAttrs(item)" @mousedown.prevent @click="run(item)">
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon(item.name)" />
            </button>
          </div>
          <div class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <button v-bind="buttonAttrs(table)" @mousedown.prevent @click="run(table)">
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon(table.name)" />
            </button>
            <BuilderDropdown
              :label="translate('zx_builder_richtext_lorem')"
              :items="loremItems"
              :disabled="disabled"
              @select="insertLorem($event.id)"
            >
              <template #trigger="{ open, menuId }">
                <button
                  v-bind="buttonAttrs({ name: 'lorem', label: 'zx_builder_richtext_lorem' })"
                  aria-haspopup="menu"
                  :aria-expanded="open"
                  :aria-controls="menuId"
                  @mousedown.prevent
                >
                  <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon('lorem')" />
                </button>
              </template>
            </BuilderDropdown>
          </div>
          <div v-if="!expanded" class="ml-auto flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <button
              v-bind="buttonAttrs({ name: 'expand', label: 'zx_builder_richtext_expand' })"
              aria-haspopup="dialog"
              @click="openExpanded"
            >
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon('expand')" />
            </button>
          </div>
        </div>
        <!-- Link editor: in-page anchors (#id), relative paths, web, mail and phone links. -->
        <form
          v-if="linkOpen"
          class="flex flex-wrap items-center gap-1 border-b-slim border-zaux-light-grey bg-zaux-accent/5 p-1"
          :aria-label="translate('zx_builder_richtext_link')"
          @submit.prevent
          @keydown.esc.prevent="closeLink(true)"
        >
          <BuilderInput
            ref="linkField"
            v-model="linkHref"
            :label="translate('zx_builder_richtext_link_url')"
            :placeholder="translate('zx_builder_richtext_link_placeholder')"
            autocomplete="off"
            class="h-[28px] min-w-[160px] flex-1 rounded-xxs text-[11px]"
            @input="linkError = ''"
            @keydown.enter.prevent="applyLink"
          />
          <label class="flex items-center gap-0.5 text-[10px] text-zaux-dark-grey">
            <input v-model="linkNewTab" type="checkbox" class="!w-auto accent-zaux-accent" />
            {{ translate('zx_builder_richtext_link_new_tab') }}
          </label>
          <div class="flex gap-0.25">
            <BuilderButton size="xs" :label="translate('zx_builder_richtext_link_apply')" @click="applyLink" />
            <button
              v-if="active.link"
              v-bind="buttonAttrs({ name: 'unlink', label: 'zx_builder_richtext_link_remove', danger: true })"
              @mousedown.prevent
              @click="removeLink"
            >
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon('unlink')" />
            </button>
          </div>
          <p v-if="linkError" role="alert" class="w-full text-[10px] text-utility-error">{{ translate(linkError) }}</p>
        </form>
        <div v-if="inTable" class="flex flex-wrap items-center gap-1 border-b-slim border-zaux-light-grey bg-zaux-accent/5 p-1" role="toolbar" :aria-label="translate('zx_builder_richtext_table_tools')">
          <div v-for="(group, index) in tableGroups" :key="index" class="flex gap-0.25 rounded-xs bg-zaux-light p-0.25">
            <button v-for="item in group" :key="item.name" v-bind="buttonAttrs(item)" @mousedown.prevent @click="run(item)">
              <span aria-hidden="true" class="block h-[16px] w-[16px]" :style="maskIcon(item.name)" />
            </button>
          </div>
        </div>
        <EditorContent :editor="editor" class="zb-richtext font-builder text-[12px] leading-[1.6]" :class="{ 'zb-richtext-expanded min-h-0 flex-1 overflow-y-auto text-[14px]': expanded }" />
      </div>
    </Teleport>
  </div>
</template>
<script>
import { defineComponent, shallowRef, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { richTextContent, richTextHref, sanitizeRichText } from '../../../services/richtext.js';
import { loremIpsum, loremLengths } from '../../../../domain/lorem-ipsum.js';
import { useTranslation } from '../../../composables/useTranslation.js';

const headingLevels = [1, 2, 3, 4, 5, 6];

export default defineComponent({
  components: { EditorContent },
  props: { modelValue: { type: String, default: '' }, label: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { translate } = useTranslation();
    const editor = shallowRef(null);
    const active = ref({}); const available = ref({}); const inTable = ref(false);
    const blockType = ref('paragraph');
    // `mark` names the TipTap node/mark checked for the pressed state.
    const action = (name, command, { toggle = false, args, danger = false, mark } = {}) => ({ name, command, toggle, args, danger, mark: mark ?? name, label: `zx_builder_richtext_${name}` });
    const history = [action('undo', 'undo'), action('redo', 'redo')];
    const blockquote = action('blockquote', 'toggleBlockquote', { toggle: true });
    const marks = [
      action('bold', 'toggleBold', { toggle: true }), action('italic', 'toggleItalic', { toggle: true }),
      action('underline', 'toggleUnderline', { toggle: true }), action('strike', 'toggleStrike', { toggle: true }),
      action('clear', 'unsetAllMarks')
    ];
    const linkAction = action('link', 'setLink', { toggle: true, args: { href: '#' } });
    const lists = [action('bullets', 'toggleBulletList', { toggle: true, mark: 'bulletList' }), action('numbers', 'toggleOrderedList', { toggle: true, mark: 'orderedList' })];
    const table = action('table', 'insertTable', { args: { rows: 3, cols: 3, withHeaderRow: true } });
    const tableGroups = [
      [action('row_before', 'addRowBefore'), action('row_after', 'addRowAfter'), action('row_delete', 'deleteRow', { danger: true })],
      [action('column_before', 'addColumnBefore'), action('column_after', 'addColumnAfter'), action('column_delete', 'deleteColumn', { danger: true })],
      [action('header', 'toggleHeaderRow'), action('merge', 'mergeCells'), action('split', 'splitCell')],
      [action('table_delete', 'deleteTable', { danger: true })]
    ];
    const toolbarActions = [...history, blockquote, ...marks, linkAction, ...lists, table, ...tableGroups.flat()];

    const blockLabel = type => type === 'paragraph' ? 'zx_builder_richtext_paragraph' : `zx_builder_richtext_${type}`;
    const blockItems = computed(() => ['paragraph', ...headingLevels.map(level => `h${level}`)].map(id => ({
      id, label: translate(blockLabel(id)), active: blockType.value === id
    })));
    const loremItems = computed(() => loremLengths.map(({ id }) => ({ id, label: translate(`zx_builder_richtext_lorem_${id}`) })));

    // Same masked-SVG approach as the Style quickpad: the icon follows the text color.
    function maskIcon(name) {
      const image = `url("/assets/builder/richtext-${name}.svg")`;
      return {
        backgroundColor: 'currentColor',
        maskImage: image, WebkitMaskImage: image,
        maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center'
      };
    }
    function buttonAttrs(item) {
      const pressed = item.toggle ? !!active.value[item.name] : undefined;
      return {
        type: 'button',
        title: translate(item.label),
        'aria-label': translate(item.label),
        'aria-pressed': pressed,
        disabled: props.disabled || (item.command ? !available.value[item.name] : false),
        class: [
          'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-xxs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zaux-accent disabled:cursor-not-allowed disabled:opacity-40',
          pressed ? 'bg-zaux-white text-zaux-accent shadow-sm'
            : item.danger ? 'text-utility-error hover:bg-zaux-white/70'
              : 'text-zaux-dark-grey hover:bg-zaux-white/70 hover:text-zaux-dark'
        ]
      };
    }

    function updateToolbar(instance) {
      active.value = Object.fromEntries(toolbarActions.filter(item => item.toggle).map(item => [item.name, instance.isActive(item.mark)]));
      available.value = Object.fromEntries(toolbarActions.map(item => [item.name, instance.can()[item.command](item.args)]));
      const level = headingLevels.find(value => instance.isActive('heading', { level: value }));
      blockType.value = level ? `h${level}` : 'paragraph';
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
        extensions: [
          StarterKit.configure({
            heading: { levels: headingLevels }, codeBlock: false, horizontalRule: false,
            // No implicit target/rel: both are chosen in the link editor.
            link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https', HTMLAttributes: { target: null, rel: null }, isAllowedUri: url => !!richTextHref(url) }
          }),
          TableKit
        ],
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
    function run(item) {
      if (!props.disabled && editor.value) editor.value.chain().focus()[item.command](item.args).run();
    }
    function setBlock(id) {
      if (props.disabled || !editor.value) return;
      const chain = editor.value.chain().focus();
      (id === 'paragraph' ? chain.setParagraph() : chain.setHeading({ level: Number(id.slice(1)) })).run();
    }
    function insertLorem(id) {
      if (props.disabled || !editor.value) return;
      const length = loremLengths.find(item => item.id === id);
      const text = loremIpsum(id);
      // A sentence joins the current paragraph; longer lengths insert paragraph nodes.
      const content = length?.paragraphs
        ? text.map(paragraph => ({ type: 'paragraph', content: [{ type: 'text', text: paragraph }] }))
        : [{ type: 'text', text: text[0] }];
      editor.value.chain().focus().insertContent(content).run();
    }

    const linkOpen = ref(false); const linkHref = ref(''); const linkNewTab = ref(false); const linkError = ref('');
    const linkField = ref(null);
    async function toggleLink() {
      if (linkOpen.value) return closeLink(true);
      if (props.disabled || !editor.value) return;
      const attrs = editor.value.getAttributes('link');
      linkHref.value = attrs.href ?? '';
      linkNewTab.value = attrs.target === '_blank';
      linkError.value = '';
      linkOpen.value = true;
      await nextTick();
      // BuilderInput renders the <input> as its root element.
      linkField.value?.$el?.focus?.();
    }
    function closeLink(focusEditor = false) {
      linkOpen.value = false;
      linkError.value = '';
      if (focusEditor) editor.value?.commands.focus();
    }
    function applyLink() {
      if (props.disabled || !editor.value) return;
      if (!linkHref.value.trim()) return removeLink();
      const href = richTextHref(linkHref.value);
      if (!href) { linkError.value = 'zx_builder_richtext_link_invalid'; return; }
      const attrs = { href, target: linkNewTab.value ? '_blank' : null, rel: linkNewTab.value ? 'noopener noreferrer' : null };
      const chain = editor.value.chain().focus();
      if (editor.value.state.selection.empty && !editor.value.isActive('link')) {
        // Without a selection the address becomes the link text.
        chain.insertContent({ type: 'text', text: linkHref.value.trim(), marks: [{ type: 'link', attrs }] }).unsetMark('link').run();
      } else chain.extendMarkRange('link').setLink(attrs).run();
      closeLink();
    }
    function removeLink() {
      editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
      closeLink();
    }

    const expanded = ref(false); const expandedHost = ref(null);
    let previousFocus;
    async function openExpanded() {
      if (props.disabled || expanded.value) return;
      previousFocus = document.activeElement;
      expanded.value = true;
      await nextTick();
      editor.value?.commands.focus();
    }
    async function closeExpanded() {
      if (!expanded.value) return;
      expanded.value = false;
      await nextTick();
      if (previousFocus?.isConnected) previousFocus.focus();
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
      if (props.disabled) closeLink();
    });
    onBeforeUnmount(() => editor.value?.destroy());
    return {
      translate, editor, history, blockquote, marks, linkAction, lists, table, tableGroups, active, available, inTable,
      blockType, blockItems, blockLabel, loremItems, maskIcon, buttonAttrs, run, setBlock, insertLorem,
      linkOpen, linkHref, linkNewTab, linkError, linkField, toggleLink, closeLink, applyLink, removeLink,
      expanded, expandedHost, openExpanded, closeExpanded
    };
  }
});
</script>
<style scoped>
.zb-richtext :deep(.tiptap) { min-height: 160px; max-height: 420px; overflow-y: auto; padding: 12px; outline: none; white-space: pre-wrap; overflow-wrap: anywhere; }
.zb-richtext-expanded :deep(.tiptap) { min-height: 100%; max-height: none; padding: 24px max(24px, calc((100% - 760px) / 2)); }
.zb-richtext :deep(.tiptap:focus) { box-shadow: inset 0 0 0 1px rgb(var(--zx-color-set1-accent)); }
.zb-richtext :deep(p) { margin: 0 0 0.5em; }
.zb-richtext :deep(p:last-child) { margin-bottom: 0; }
.zb-richtext :deep(ul) { list-style: disc; padding-left: 1.5em; }
.zb-richtext :deep(ol) { list-style: decimal; padding-left: 1.5em; }
.zb-richtext :deep(strong) { font-weight: 700; }
.zb-richtext :deep(em) { font-style: italic; }
.zb-richtext :deep(u) { text-decoration: underline; }
.zb-richtext :deep(a) { color: rgb(var(--zx-color-set1-accent)); text-decoration: underline; text-underline-offset: 2px; }
.zb-richtext :deep(blockquote) { border-left: 2px solid currentColor; padding-left: 0.75em; }
.zb-richtext :deep(:is(h1, h2, h3, h4, h5, h6)) { font-weight: 650; line-height: 1.25; margin: 0.75em 0 0.4em; }
.zb-richtext :deep(h1) { font-size: 1.75em; }
.zb-richtext :deep(h2) { font-size: 1.4em; }
.zb-richtext :deep(h3) { font-size: 1.15em; }
.zb-richtext :deep(h4) { font-size: 1.05em; }
.zb-richtext :deep(h5) { font-size: 1em; }
.zb-richtext :deep(h6) { font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.04em; }
.zb-richtext :deep(s) { text-decoration: line-through; }
.zb-richtext :deep(table) { border-collapse: collapse; table-layout: fixed; width: 100%; min-width: 240px; margin: 12px 0; }
.zb-richtext :deep(td), .zb-richtext :deep(th) { border: 1px solid rgb(var(--zx-color-set1-dark) / 0.2); min-width: 48px; padding: 6px 8px; position: relative; vertical-align: top; }
.zb-richtext :deep(th) { background: rgb(var(--zx-color-set1-dark) / 0.05); font-weight: 650; text-align: left; }
.zb-richtext :deep(.selectedCell::after) { background: rgb(var(--zx-color-set1-accent) / 0.12); content: ''; position: absolute; inset: 0; pointer-events: none; }
.zb-richtext :deep(.tableWrapper) { overflow-x: auto; }
</style>
