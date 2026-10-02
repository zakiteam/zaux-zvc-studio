function allowsBuilderShortcut(event) {
  if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return false;
  const target = event.target;
  if (target?.isContentEditable || target?.closest?.('input, textarea, select, [role="textbox"], .cm-editor, dialog[open], [role="dialog"]')) return false;
  const document = target?.ownerDocument;
  return !document?.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
}

export function builderHistoryShortcut(event) {
  if (!allowsBuilderShortcut(event) || event.key.toLowerCase() !== 'z') return null;
  return event.shiftKey ? 'redo' : 'undo';
}

export function nodeClipboardShortcut(event) {
  if (!allowsBuilderShortcut(event) || event.shiftKey || event.target?.ownerDocument?.getSelection()?.toString()) return null;
  return { c: 'copy-node', v: 'paste-node', x: 'cut-node', d: 'duplicate-node' }[event.key.toLowerCase()] ?? null;
}
