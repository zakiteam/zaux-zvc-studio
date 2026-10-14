// Interaction states the Style controls can author. A state is a Tailwind variant written after
// the breakpoint (`md:hover:bg-…`), so authored data stays a plain class list and exports as is.
// UI policy only: add, remove or reorder entries here; `value` is a Tailwind 3 variant with its
// trailing colon and `label` a locale key. Removing a state never removes authored classes.
export const styleStates = [
  { value: 'hover:', label: 'zx_builder_style_state_hover' },
  { value: 'focus:', label: 'zx_builder_style_state_focus' },
  { value: 'focus-visible:', label: 'zx_builder_style_state_focus_visible' },
  { value: 'active:', label: 'zx_builder_style_state_active' },
  { value: 'disabled:', label: 'zx_builder_style_state_disabled' }
];
