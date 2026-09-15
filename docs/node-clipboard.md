# Node clipboard

The builder keeps one private JSON snapshot in memory for its mounted session. It survives selection changes, template changes, paste and undo/redo; it is not persisted or written to the operating system clipboard.

## Builder API

- `copySelectedNode()` captures the selected visual node and all descendants; returns success.
- `pasteNode(targetId = nodeId, position = 'after', targetInstanceId = instanceId)` inserts a fresh independent copy and selects it after a successful commit; returns success.
- `canPasteNodeAt(targetId, position, targetInstanceId)` checks the same destination rules without mutations. Positions are `before`, `after`, and `inside` (known containers only).
- `canCopyNode`, `canPasteNode`, and `clipboardNodeName` are computed refs for UI controls.
- `clearNodeClipboard()` releases the snapshot.
- `dropElement({ kind: 'clipboard' }, targetId, position, targetInstanceId)` uses the same insertion path.

With no selected node, paste appends to the active visual definition. An empty template receives a new instance. Source-backed structures cannot be edited. Paste respects project permissions and uses one undoable commit. Duplicate retains its existing behavior: an adjacent copy with the original bindings.

Clipboard copying resolves property bindings to the values present at copy time, so another definition's data cannot change the pasted content. Literal false, zero, empty strings and null survive. Referenced partial definitions are captured independently and receive collision-free names on insertion. The owning definition's CSS is carried across as a whole because selectors cannot reliably be attributed to an individual subtree; it can therefore affect other destination nodes. Partial source implementations remain shared, following the existing native component contract.

## Controls

The left side of `BuilderPreviewControls` offers Copy and Paste. The copied-node label can be dragged to canvas or outline destinations, or clicked to paste after the selection. Canvas selection labels expose Copy and Duplicate through same-origin, selected-target-checked messages. Their measured toolbar position is clamped to the iframe viewport, moving inside the element when there is no space above it.

Runtime verification is left to the user. No automated tests, browser checks, validators or production builds were run.
