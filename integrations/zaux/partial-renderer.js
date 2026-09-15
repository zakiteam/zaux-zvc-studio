// Resolve virtual partial descriptors anywhere, including slider/content props.
// This helper also ships with JavaScript exports; it has no Studio dependencies.
export function resolvePartials(value, registry, params = {}, depth = 0) {
  if (depth > 200) throw new Error('zx_builder_partial_cycle');
  if (Array.isArray(value)) return value.map(item => resolvePartials(item, registry, params, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const partial = typeof value.name === 'string' && Object.hasOwn(registry, value.name) ? registry[value.name] : null;
  if (partial && value.props && typeof value.props === 'object' && !Array.isArray(value.props)) {
    const props = resolvePartials(value.props, registry, params, depth + 1);
    const rendered = partial.buildNode(props, params);
    const nodes = resolvePartials(Array.isArray(rendered) ? rendered : [rendered], registry, params, depth + 1).filter(Boolean);
    if (props['data-zb-node']) {
      for (const node of nodes) node.props = { ...node.props, 'data-zb-node': props['data-zb-node'], draggable: true };
    }
    // Zaux sliders pass only name/props to <component>. Keep the complete tree
    // in props.components so nested card content survives dynamic rendering.
    return { type: 'component', name: 'ComponentsRenderer', props: { components: nodes } };
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolvePartials(item, registry, params, depth + 1)]));
}
