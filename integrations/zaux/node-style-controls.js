import spacing from '../../vendor/zaux/style/tokens/spacing.json';
import colors from '../../vendor/zaux/style/tokens/colors.json';
import overlays from '../../vendor/zaux/style/tokens/overlays.json';
import gradients from '../../vendor/zaux/style/tokens/gradients.json';
import borders from '../../vendor/zaux/style/tokens/borders.json';
import radius from '../../vendor/zaux/style/tokens/radius.json';
import breakpoints from '../../vendor/zaux/style/tokens/breakpoints.json';

function leaves(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}-${key}` : key;
    return value && typeof value === 'object' ? leaves(value, name) : [name];
  });
}
const allColors = [...leaves(colors), ...Object.keys(overlays)];
const palette = allColors.filter(name => !name.startsWith('zaux-'));

function colorSwatch(name) {
  if (name === 'transparent') return 'transparent';
  if (Object.hasOwn(overlays, name)) return overlays[name];
  return `rgb(var(--zx-color-${name}))`;
}

function spacingLabel(key, value) {
  // Display the pixel equivalent at the standard 16px root size; keep the token class.
  const pixels = value.endsWith('rem') ? Number.parseFloat(value) * 16 : Number.parseFloat(value);
  return `${key} \u00b7 ${pixels}px`;
}
const semanticValues = new Set(["flex","grid","block","inline-block","inline","inline-flex","inline-grid","contents","hidden","flow-root","table","table-row","table-cell","list-item","flex-row","flex-col","flex-row-reverse","flex-col-reverse","flex-nowrap","flex-wrap","flex-wrap-reverse","items-start","items-center","items-end","items-stretch","items-baseline","justify-start","justify-center","justify-end","justify-between","justify-around","justify-evenly","justify-normal","justify-stretch","border-solid","border-dashed","border-dotted","border-double","border-hidden","bg-none","grid-cols-none"]);
const options = values => values.map(value => ({
  value,
  label: semanticValues.has(value) ? 'zx_builder_style_value_' + value : value.replace(/^grid-cols-(\d+)$/, '$1')
}));
const prefixed = (prefix, values) => options(values.map(value => `${prefix}-${value}`));
const control = (id, values, extra = {}) => ({ id, label: `zx_builder_style_${id}`, options: options(values), ...extra });
function illustratedControl(id, values, matchValues = values) {
  return control(id, values, {
    illustrated: true,
    matchValues,
    options: options(values).map(option => ({
      ...option,
      icon: `/assets/builder/layout-${option.value}.svg`
    }))
  });
}
const spaceControl = (prefix, id = prefix) => control(id, [], {
  spacing: true,
  family: prefix.startsWith('gap') ? 'gap' : prefix[0],
  pattern: new RegExp(`^-?${prefix}-.+$`),
  options: [
    ...Object.entries(spacing.spaces).sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([key, value]) => ({ value: `${prefix}-${key}`, label: spacingLabel(key, value) })),
    ...(prefix.startsWith('m') ? [{ value: `${prefix}-auto`, label: 'auto' }] : [])
  ]
});
function colorControl(id, prefix) {
  return control(id, [], {
    color: true,
    opacity: true,
    // Existing zaux colors must still be recognized when replacing a saved class.
    matchValues: allColors.map(name => `${prefix}-${name}`),
    options: palette.map(name => ({
      value: `${prefix}-${name}`,
      label: name,
      swatch: colorSwatch(name)
    }))
  });
}

export const styleBreakpoints = Object.entries(breakpoints).map(([name, min]) => ({ value: `${name}:`, label: `${name} ≥ ${min}` }));
export const nodeStyleSections = [
  { id: 'layout', controls: [
    illustratedControl('display', ['block', 'flex', 'grid'], ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'hidden', 'flow-root', 'table', 'table-row', 'table-cell', 'list-item']),
    illustratedControl('direction', ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse']),
    illustratedControl('wrap', ['flex-nowrap', 'flex-wrap', 'flex-wrap-reverse']),
    control('columns', [...Array.from({ length: 12 }, (_, index) => `grid-cols-${index + 1}`), 'grid-cols-none'], { pattern: /^grid-cols-.+$/ }),
    illustratedControl('align', ['items-start', 'items-center', 'items-end', 'items-stretch', 'items-baseline']),
    illustratedControl('justify', ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly', 'justify-normal', 'justify-stretch']),
    spaceControl('gap-x', 'gap_x'), spaceControl('gap-y', 'gap_y')
  ] },
  { id: 'padding', controls: ['t', 'r', 'b', 'l'].map(side => spaceControl(`p${side}`)) },
  { id: 'margin', controls: ['t', 'r', 'b', 'l'].map(side => spaceControl(`m${side}`)) },
  { id: 'text', controls: [colorControl('text_color', 'text')] },
  { id: 'fill', controls: [
    colorControl('background', 'bg'),
    control('gradient', ['bg-none', ...Object.keys(gradients).map(key => `bg-${key}`), ...['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'].map(direction => `bg-gradient-to-${direction}`)], { pattern: /^bg-(?:none|gradient-.+)$/ }),
    colorControl('from', 'from'), colorControl('via', 'via'), colorControl('to', 'to')
  ] },
  { id: 'border', controls: [
    control('border_width', [], { options: prefixed('border', Object.keys(borders.widths)) }),
    control('border_style', ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden']),
    colorControl('border_color', 'border'),
    control('radius', [], { options: prefixed('rounded', Object.keys(radius)) })
  ] }
];