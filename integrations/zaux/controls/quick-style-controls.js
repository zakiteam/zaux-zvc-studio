// Quick style tabs: a curated view over nodeStyleSections, not a second control registry.
// Every tab picks sections and controls with the shape of styleViewportVisibility `sections`
// (true = whole section, array = control ids; global/side pairs keep the section toggle),
// so new tabs or controls only need ids that already exist in node-style-controls.js.
// id: tab key, default label `zx_builder_style_<id>` and icon `/assets/builder/quickpad-<id>.svg`;
// `label` and `icon` override them. Order here is the tab order.
// BuilderStyleQuickpad exposes a `tab-<id>` scoped slot ({ tab, editor }) to replace a tab's UI.
export const quickStyleTabs = [
  { id: 'layout', sections: { layout: ['display', 'direction', 'columns', 'align', 'justify', 'gap_x', 'gap_y'] } },
  { id: 'padding', sections: { padding: true } },
  { id: 'margin', sections: { margin: true } },
  { id: 'text', sections: { text: ['typography', 'text_color'] } },
  { id: 'fill', label: 'zx_builder_style_background', sections: { fill: ['background'] } },
  { id: 'dimensions', sections: { dimensions: ['width', 'height'] } },
  { id: 'aspect_ratio', sections: { aspect_ratio: true } },
  { id: 'overflow', sections: { layout: ['overflow'] } },
  { id: 'shadow', sections: { shadow: true } },
  { id: 'border', sections: { border: true } },
  { id: 'rounding', sections: { rounding: true } },
  { id: 'blur', sections: { blur: true } }
];
