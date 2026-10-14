// Quick style tabs: a curated view over nodeStyleSections, not a second control registry.
// Every tab picks sections and controls with the shape of styleViewportVisibility `sections`
// (true = whole section, array = control ids; global/side pairs keep the section toggle),
// so new tabs or controls only need ids that already exist in node-style-controls.js.
// id: tab key, default label `zx_builder_style_<id>` and icon `/assets/builder/quickpad-<id>.svg`;
// `label` and `icon` override them. Order here is the tab order.
// `segment` groups tabs into segmented rows that wrap as a unit, as in the Inspector quickpad:
// 'box' (layout and box model), default 'appearance'; extra tabs (image) default to 'setup'.
// BuilderStyleQuickpad exposes a `tab-<id>` scoped slot ({ tab, editor }) to replace a tab's UI.
export const quickStyleTabs = [
  { id: 'layout', segment: 'box', sections: { layout: ['display', 'direction', 'columns', 'align', 'justify', 'gap_x', 'gap_y'] } },
  { id: 'padding', segment: 'box', sections: { padding: true } },
  { id: 'margin', segment: 'box', sections: { margin: true } },
  { id: 'dimensions', segment: 'box', sections: { dimensions: ['width', 'height'] } },
  { id: 'aspect_ratio', segment: 'box', sections: { aspect_ratio: true } },
  { id: 'overflow', segment: 'box', sections: { layout: ['overflow'] } },
  { id: 'placement', segment: 'box', sections: { placement: true } },
  { id: 'transform', segment: 'box', sections: { transform: ['translate_x', 'translate_y', 'scale', 'rotate', 'origin'] } },
  { id: 'text', sections: { text: ['typography', 'text_color'] } },
  { id: 'fill', label: 'zx_builder_style_background', sections: { fill: ['background'] } },
  { id: 'shadow', sections: { shadow: true } },
  { id: 'border', sections: { border: true } },
  { id: 'rounding', sections: { rounding: true } },
  { id: 'filter', sections: { filter: true, backdrop: true } },
  { id: 'blend', sections: { blend: true } },
  { id: 'transition', sections: { transition: true } }
];
