// Options: { authored: true } when the event comes from the preview iframe. There the document is the
// authored page, whose role="dialog" elements (Zaux OffCanvas/ZModal stay in the DOM while hidden)
// must not disable editing shortcuts; only native open dialogs count.
const TEXT_ENTRY = 'input, textarea, select, [role="textbox"], .cm-editor';
function insideDialog(target, options) {
  return !!target?.closest?.(options?.authored ? 'dialog[open]' : 'dialog[open], [role="dialog"]');
}
function dialogOpen(target, options) {
  return !!target?.ownerDocument?.querySelector(options?.authored ? 'dialog[open]' : 'dialog[open], [role="dialog"][aria-modal="true"]');
}
function textEntry(target) {
  return !!(target?.isContentEditable || target?.closest?.(TEXT_ENTRY));
}

function allowsBuilderShortcut(event, options) {
  if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return false;
  const target = event.target;
  return !textEntry(target) && !insideDialog(target, options) && !dialogOpen(target, options);
}

export function builderHistoryShortcut(event, options) {
  if (!allowsBuilderShortcut(event, options) || event.key.toLowerCase() !== 'z') return null;
  return event.shiftKey ? 'redo' : 'undo';
}

export function nodeClipboardShortcut(event, options) {
  if (!allowsBuilderShortcut(event, options) || event.shiftKey || event.target?.ownerDocument?.getSelection()?.toString()) return null;
  return { c: 'copy-node', v: 'paste-node', x: 'cut-node', d: 'duplicate-node' }[event.key.toLowerCase()] ?? null;
}

// Figma-style canvas/layout keys: Ctrl+\ toggles the panels, Shift+1 fits, Shift+0 is 100%, Ctrl +/- zooms,
// Shift+M toggles the CSS box-model inspector, Shift+Space toggles the preview (Figma's preview key).
// Navigation keys work from form fields too (not from code/rich-text editors, where Ctrl+L selects a line):
// Ctrl+P opens the command palette, Ctrl+K focuses the Elements search, Ctrl+L the Library search,
// Ctrl+E opens the export dialog on the selected ZVC.
// Alt+1/2/3 open the Structure, Library and Elements tabs (Figma's Alt+number panels); the physical
// key is read so macOS Option, which types a character, works too.
export function layoutShortcut(event, options) {
  if (event.defaultPrevented || event.isComposing) return null;
  const target = event.target;
  if (dialogOpen(target, options)) return null;
  if (event.altKey) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || target?.isContentEditable || target?.closest?.('.cm-editor')) return null;
    return { Digit1: 'tab-layers', Digit2: 'tab-library', Digit3: 'tab-elements' }[event.code] ?? null;
  }
  const command = event.ctrlKey || event.metaKey;
  if (command && !event.shiftKey && !target?.isContentEditable && !target?.closest?.('.cm-editor') && !insideDialog(target, options)) {
    const navigation = { p: 'command-palette', k: 'focus-elements', l: 'focus-library', e: 'export-component' }[event.key.toLowerCase()];
    if (navigation) return navigation;
  }
  if (textEntry(target) || insideDialog(target, options)) return null;
  if (command && !event.shiftKey && (event.key === '\\' || event.code === 'Backslash')) return 'toggle-panels';
  if (command && ['=', '+'].includes(event.key)) return 'zoom-in';
  if (command && event.key === '-') return 'zoom-out';
  if (!command && event.shiftKey && event.code === 'Digit1') return 'zoom-fit';
  if (!command && event.shiftKey && event.code === 'Digit0') return 'zoom-reset';
  // Shift+M ("measure") toggles the box-model inspector on the canvas.
  if (!command && event.shiftKey && event.code === 'KeyM') return 'toggle-css-inspect';
  if (!command && event.shiftKey && event.code === 'Space') return 'toggle-preview';
  return null;
}

// Delete (Canc) removes the selected node, outside text entry and dialogs.
export function nodeDeleteShortcut(event, options) {
  if (event.key !== 'Delete' || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const target = event.target;
  if (textEntry(target) || insideDialog(target, options) || dialogOpen(target, options)) return null;
  return 'delete-node';
}

// Escape clears the node selection, outside text entry and dialogs.
export function nodeDeselectShortcut(event, options) {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  const target = event.target;
  return !textEntry(target) && !insideDialog(target, options) && !dialogOpen(target, options);
}

// Node context-menu actions (item ids of useNodeContextMenu), Figma-like where Figma has an equivalent:
// Shift+Enter selects the parent, Ctrl+Alt+G wraps (frame selection), Ctrl+Alt+K creates a ZVC (create
// component), Ctrl+Alt+B detaches the instance. Letters are matched on event.code, so macOS Option and
// AltGr layouts still work. Copy, paste and duplicate stay on nodeClipboardShortcut, delete on
// nodeDeleteShortcut; they are listed here (clipboard: true) only for the menu labels.
export const NODE_MENU_SHORTCUTS = {
  'select-zvc': { key: 'Enter', command: true, shift: true },
  'select-parent': { key: 'Enter', shift: true },
  'quick-style': { code: 'KeyS', command: true, alt: true },
  'edit-library': { code: 'KeyL', command: true, alt: true },
  'reset-hard': { code: 'KeyR', command: true, alt: true, shift: true },
  'reset-soft': { code: 'KeyR', command: true, alt: true },
  detach: { code: 'KeyB', command: true, alt: true },
  'copy-node': { code: 'KeyC', command: true, clipboard: true },
  'paste-node': { code: 'KeyV', command: true, clipboard: true },
  'duplicate-node': { code: 'KeyD', command: true, clipboard: true },
  'delete-node': { key: 'Delete', clipboard: true },
  'new-zvc': { code: 'KeyK', command: true, alt: true },
  'new-zvp': { code: 'KeyP', command: true, alt: true },
  wrap: { code: 'KeyG', command: true, alt: true },
  'export-runtime': { code: 'KeyJ', command: true, alt: true },
  'export-js': { code: 'KeyJ', command: true, alt: true, shift: true },
};

// Works from the outline rows too (Shift+Enter there must not click the row), never in text entry, dialogs or open menus.
export function nodeMenuShortcut(event, options) {
  if (event.defaultPrevented || event.isComposing) return null;
  const target = event.target;
  if (textEntry(target) || insideDialog(target, options) || dialogOpen(target, options) || target?.closest?.('[role="menu"]')) return null;
  const command = event.ctrlKey || event.metaKey;
  for (const [action, keys] of Object.entries(NODE_MENU_SHORTCUTS)) {
    if (keys.clipboard || !!keys.command !== command || !!keys.alt !== event.altKey || !!keys.shift !== event.shiftKey) continue;
    if (keys.code ? event.code === keys.code : event.key === keys.key) return action;
  }
  return null;
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
// Visible label (Ctrl+Alt+K, ⌥⌘K on macOS) and aria-keyshortcuts value of a node-menu action.
export function nodeMenuShortcutLabel(action, { aria = false } = {}) {
  const keys = NODE_MENU_SHORTCUTS[action];
  if (!keys) return undefined;
  const key = keys.code ? keys.code.slice(3) : keys.key;
  if (aria) return [keys.command && (MAC ? 'Meta' : 'Control'), keys.alt && 'Alt', keys.shift && 'Shift', key].filter(Boolean).join('+');
  if (MAC) return [keys.alt && '⌥', keys.shift && '⇧', keys.command && '⌘', key === 'Enter' ? '↵' : key].filter(Boolean).join('');
  return [keys.command && 'Ctrl', keys.alt && 'Alt', keys.shift && 'Shift', key].filter(Boolean).join('+');
}
