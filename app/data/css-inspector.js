// Box-model inspector for the canvas preview (toolbar toggle, Shift+M, highlightNodeCSS).
// Computed CSS properties listed in the hover details, in display order. Any CSS property
// name accepted by getComputedStyle().getPropertyValue() works; empty values are skipped.
export const cssInspectorProperties = [
  'display',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'color',
  'background-color',
  'gap',
  'border-radius',
];

// Layer colors, DevTools-like: translucent so the authored content stays readable.
export const cssInspectorColors = {
  margin: 'rgba(246, 178, 107, 0.55)',
  border: 'rgba(255, 229, 153, 0.65)',
  padding: 'rgba(147, 196, 125, 0.55)',
  content: 'rgba(111, 168, 220, 0.45)',
};

// Accepts only a list of property names; anything else falls back to the defaults.
export function normalizeInspectorProperties(value) {
  if (!Array.isArray(value)) return [...cssInspectorProperties];
  return value.filter(item => typeof item === 'string' && /^-{0,2}[a-z][a-z0-9-]*$/i.test(item.trim())).map(item => item.trim());
}
