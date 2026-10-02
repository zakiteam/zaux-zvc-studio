# Node clipboard

The builder keeps one private JSON snapshot in memory for its mounted session. It survives selection changes, template changes, paste and undo/redo; it is not persisted or written to the operating system clipboard.

## Builder API

- `copySelectedNode()` captures the selected visual node and all descendants; returns success.
- `cutSelectedNode()` captures the selected visual node, then removes it through the existing undoable delete action; returns success. It requires edit permission and restores the previous clipboard if deletion fails.
- `pasteNode(targetId = nodeId, position = 'auto', targetInstanceId = instanceId)` inserts a fresh independent copy and selects it after a successful commit; returns success. Automatic placement appends inside the selected node when the existing drop rules allow it, otherwise after it.
- `canPasteNodeAt(targetId, position = 'auto', targetInstanceId)` checks the same destination rules without mutations. Explicit positions are `before`, `after`, and `inside` (known containers only); drag-and-drop keeps its explicit position.
- `canCopyNode`, `canPasteNode`, and `clipboardNodeName` are computed refs for UI controls.
- `clearNodeClipboard()` releases the snapshot.
- `dropElement({ kind: 'clipboard' }, targetId, position, targetInstanceId)` uses the same insertion path.

With no selected node, paste appends to the active visual definition. An empty template receives a new instance. Source-backed structures cannot be edited. Paste respects project permissions and uses one undoable commit. Duplicate retains its existing behavior: an adjacent copy with the original bindings.

Clipboard copying resolves property bindings to the values present at copy time, so another definition's data cannot change the pasted content. Literal false, zero, empty strings and null survive. Referenced partial definitions are captured independently and receive collision-free names on insertion. The owning definition's CSS is carried across as a whole because selectors cannot reliably be attributed to an individual subtree; it can therefore affect other destination nodes. Partial source implementations remain shared, following the existing native component contract.

## Controls

Ctrl+Z and Ctrl+Shift+Z in the canvas iframe invoke the builder's shared undo/redo history (Command on macOS), including with no node selected. Same-origin messages are checked against the active iframe; the parent enforces edit permission and ignores history requests during preview-only mode or a builder modal. Text fields and code/rich-text editors retain their local undo/redo behavior.

Ctrl+C copies the selected node, Ctrl+V pastes inside the selected container when allowed (otherwise after the selected node), Ctrl+X copies and removes the selected node, and Ctrl+D duplicates it alongside the original without changing the clipboard. On macOS, the same shortcuts use Command. They work in the design editor and its canvas iframe, leaving text fields, rich-text/code editors, text selections and dialogs to native keyboard handling. Preview-only mode does not intercept them. Holding a shortcut does not repeat the action. The clipboard remains internal to Studio, including after cutting or pasting.

The Copy/Paste controls and copied-node label use the same automatic placement as Ctrl+V. The copied-node label can also be dragged to canvas or outline destinations. Canvas selection labels expose Copy and Duplicate through same-origin, selected-target-checked messages. Their measured toolbar position is clamped to the iframe viewport, moving inside the element when there is no space above it.

Runtime verification is left to the user. No automated tests, browser checks, validators or production builds were run.
