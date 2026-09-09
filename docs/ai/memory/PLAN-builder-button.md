# How BuilderButton is used today (inventory before rewrite)

Scanner: BuilderButton.vue is the shared chrome button. It wraps ZButton, mapping
`iconAliases` then passing `iconName` to Zaux's own `<Icon>` (renders
`assets/icon/zaux/symbol-defs.svg#name`). It is styled by dozens of `!important`
Tailwind overrides targeting the `.zb-button` root.

Variants currently referenced by consumers:
- default `secondary` (workspace/panel items, dialogs cancel, toolbar undo/redo, menus)
- `variant="primary"` (dialog confirm / destructive-primary, export/import primary)
- `theme="dark1"` (BuilderDropdown triggers on the dark top bar via `btnTheme`, plus
  `btnTheme` prop default `secondary`). `BuilderDropdown` passes `:theme=...` which today
  falls through as an attribute (only `variant` is declared).

Consumer overrides that must keep working depend on:
1. Root carries class `zb-button` (selectors like `[&.zb-button]:!bg-zaux-accent/10`).
2. A real `<button>` is reachable for focus restore
   (`trigger?.querySelector('button')`, menu items query `[role=menuitem]:not(:disabled)`).
3. `disabled`, `title`, `aria-*`, `role`, `tabindex`, click, label/icon props.
4. Small chrome glyph size and per-consumer `!min-w/!w/!p` layout overrides.

BuilderDropdown previews/merchants also pass `item.icon`, `item.active` (bright accent
tint via overrides) and `item.danger` (utility-error text) on menu action items.
