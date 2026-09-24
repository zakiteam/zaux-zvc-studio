import containers from '../../../vendor/zaux/style/tokens/containers.json';
import spacing from '../../../vendor/zaux/style/tokens/spacing.json';
import colors from '../../../vendor/zaux/style/tokens/colors.json';
import overlays from '../../../vendor/zaux/style/tokens/overlays.json';
import gradients from '../../../vendor/zaux/style/tokens/gradients.json';
import borders from '../../../vendor/zaux/style/tokens/borders.json';
import radius from '../../../vendor/zaux/style/tokens/radius.json';
export { styleBreakpoints } from '../responsive-styles.js';
import typography from '../../../vendor/zaux/style/tokens/typography.json';
import shadows from '../../../vendor/zaux/style/tokens/shadows.json';
import blur from '../../../vendor/zaux/style/tokens/blur.json';

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
  return `${pixels}px \u00b7 ${key}`;
}
// Keep positive and negative tokens in separate, consistently ordered blocks.
function spacingOptions(prefix, negative = false, depth = false) {
  const entries = Object.entries(spacing.spaces).sort((a, b) => Number(a[0]) - Number(b[0]));
  const option = (key, value, sign = '') => ({
    value: depth ? `[translate:0_0_${sign}${value === '0' ? '0px' : value}]` : `${sign}${prefix}-${key}`,
    label: spacingLabel(`${sign}${key}`, `${sign}${value}`)
  });
  return [
    ...entries.map(([key, value]) => option(key, value)),
    ...(negative ? entries.filter(([, value]) => Number.parseFloat(value) !== 0)
      .map(([key, value]) => option(key, value, '-')) : [])
  ];
}
const semanticValues = new Set(["flex","grid","block","inline-block","inline","inline-flex","inline-grid","contents","hidden","flow-root","table","table-row","table-cell","list-item","flex-row","flex-col","flex-row-reverse","flex-col-reverse","flex-nowrap","flex-wrap","flex-wrap-reverse","items-start","items-center","items-end","items-stretch","items-baseline","justify-start","justify-center","justify-end","justify-between","justify-around","justify-evenly","justify-normal","justify-stretch","col-span-full","order-first","order-last","order-none","border-solid","border-dashed","border-dotted","border-double","border-hidden","bg-none","grid-cols-none"]);
const options = values => values.map(value => ({
  value,
  label: semanticValues.has(value) ? 'zx_builder_style_value_' + value : value.replace(/^(?:grid-cols|col-span|order)-(\d+)$/, '$1')
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
  prefix,
  length: !prefix.startsWith('gap'),
  nonNegative: !prefix.startsWith('m'),
  family: prefix.startsWith('gap') ? 'gap' : prefix[0],
  pattern: new RegExp(`^-?${prefix}-.+$`),
  options: [
    ...spacingOptions(prefix, prefix.startsWith('m')),
    ...(prefix.startsWith('m') ? [{ value: `${prefix}-auto`, label: 'auto' }] : [])
  ]
});
function positionLengthControl(id, prefix = id) {
  const depth = id === 'translate_z';
  const offset = ['top', 'right', 'bottom', 'left'].includes(id);
  const utility = value => depth ? `[translate:0_0_${value}]` : `${prefix}-[${value}]`;
  return control(id, [], {
    length: true, depth, prefix,
    spacing: offset,
    family: offset ? 'inset' : undefined,
    pattern: depth ? /^\[translate:.+\]$/ : new RegExp(`^-?${prefix}-.+$`),
    options: [
      ...spacingOptions(prefix, true, depth),
      ...(!depth ? ['25%', '50%', '75%', '100%', '-25%', '-50%', '-75%', '-100%'].map(value => ({ value: utility(value), label: value })) : []),
      ...(offset ? [{ value: `${prefix}-auto`, label: 'auto' }] : [])
    ]
  });
}
function dimensionControl(id, prefix) {
  const keywords = [
    ...(['w', 'h', 'min-w'].includes(prefix) ? ['auto'] : []),
    'full', 'min', 'max', 'fit',
    ...(prefix.startsWith('max-') ? ['none'] : []),
    ...(['w', 'h', 'min-h', 'max-h'].includes(prefix) ? ['screen'] : [])
  ];
  return control(id, [], {
    length: true,
    nonNegative: true,
    prefix,
    spacing: ['w', 'h'].includes(prefix),
    family: 'size',
    pattern: new RegExp(`^${prefix}-.+$`),
    options: [
      ...keywords.map(value => ({ value: `${prefix}-${value}`, label: `zx_builder_style_dimension_${value}` })),
      ...Object.entries(spacing.spaces).sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([key, value]) => ({ value: `${prefix}-${key}`, label: spacingLabel(key, value) }))
    ]
  });
}
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


function radiusControl(corner = '') {
  const prefix = corner ? `rounded-${corner}` : 'rounded';
  return control(corner ? `radius_${corner}` : 'radius', [], {
    prefix, radius: !!corner, length: true, nonNegative: true,
    pattern: corner ? new RegExp(`^rounded-${corner}(?:-.+)?$`) : undefined,
    options: Object.entries(radius).map(([key, value]) => ({
      value: `${prefix}-${key}`, label: `${key} · ${value}`
    }))
  });
}
const radiusCorners = ['tl', 'tr', 'bl', 'br'].map(radiusControl);
const borderGlobals = [
  control('border_width', [], { options: prefixed('border', Object.keys(borders.widths)), matchValues: [...Object.keys(borders.widths).map(key => 'border-' + key), 'border', 'border-0'] }),
  control('border_style', ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden']),
  colorControl('border_color', 'border')
];
const sideNames = { t: 'top', r: 'right', b: 'bottom', l: 'left' };
function borderSide(base, side) {
  const style = base.id === 'border_style';
  const convert = value => style
    ? `[border-${sideNames[side]}-style:${value.slice(7)}]`
    : value.replace(/^border/, `border-${side}`);
  return {
    ...base, id: `${base.id}_${side}`, sideLabel: `zx_builder_style_side_${side}`,
    border: true, borderStyle: style, baseOptions: base.options,
    baseMatchValues: base.matchValues,
    options: base.options.map(option => ({ ...option, value: convert(option.value) })),
    matchValues: base.matchValues?.map(convert)
  };
}
const borderSides = Object.keys(sideNames).flatMap(side => borderGlobals.map(base => borderSide(base, side)));

function spacingSection(id, prefix) {
  const sides = ['t', 'r', 'b', 'l'].map(side => spaceControl(`${prefix}${side}`));
  return { id, controls: sides, globalControls: [{ ...spaceControl(prefix, id), globalSides: sides }] };
}

export const nodeStyleSections = [
  { id: 'layout', controls: [
    illustratedControl('display', ['block', 'flex', 'grid', 'hidden'], ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'hidden', 'flow-root', 'table', 'table-row', 'table-cell', 'list-item']),
    control('visibility', [], {
      options: [
        { value: 'visible', label: 'zx_builder_style_visibility_visible' },
        { value: 'invisible', label: 'zx_builder_style_visibility_hidden' }
      ]
    }),
    control('screen_reader', [], {
      options: [
        { value: 'sr-only', label: 'zx_builder_style_screen_reader_only' },
        { value: 'not-sr-only', label: 'zx_builder_style_screen_reader_restore' }
      ]
    }),
    illustratedControl('direction', ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse']),
    illustratedControl('wrap', ['flex-nowrap', 'flex-wrap', 'flex-wrap-reverse']),
    control('columns', [...Array.from({ length: 12 }, (_, index) => `grid-cols-${index + 1}`), 'grid-cols-none'], { pattern: /^grid-cols-.+$/ }),

    illustratedControl('align', ['items-start', 'items-center', 'items-end', 'items-stretch', 'items-baseline']),
    illustratedControl('justify', ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly', 'justify-normal', 'justify-stretch']),
    spaceControl('gap-x', 'gap_x'), spaceControl('gap-y', 'gap_y'),
    control('overflow', [], {
      options: ['visible', 'hidden', 'clip', 'auto', 'scroll'].map(value => ({
        value: `overflow-${value}`, label: `zx_builder_style_overflow_${value}`
      }))
    })
  ] },
  { id: 'placement', controls: [
    control('col_span', [...Array.from({ length: 12 }, (_, index) => `col-span-${index + 1}`), 'col-span-full'], { pattern: /^col-span-.+$/ }),
    control('order', ['order-first', ...Array.from({ length: 12 }, (_, index) => `order-${index + 1}`), 'order-last', 'order-none'], { pattern: /^-?order-.+$/ })
  ] },
  { id: 'dimensions', controls: [
    control('container', Object.keys(containers).map(selector => selector.slice(1)), { pattern: /^container(?:-.+)?$/ }),
    dimensionControl('width', 'w'), dimensionControl('height', 'h'),
    dimensionControl('min_width', 'min-w'), dimensionControl('min_height', 'min-h'),
    dimensionControl('max_width', 'max-w'), dimensionControl('max_height', 'max-h')
  ] },
  { id: 'positioning', controls: [
    control('position', ['static', 'relative', 'fixed', 'absolute'], { matchValues: ['static', 'relative', 'fixed', 'absolute', 'sticky'] }),
    control('z_index', [], {
      integer: true,
      prefix: 'z',
      pattern: /^-?z-.+$/,
      options: ['auto', 0, 10, 20, 30, 40, 50].map(value => ({ value: `z-${value}`, label: String(value) }))
    }),
    ...['top', 'right', 'bottom', 'left'].map(side => positionLengthControl(side)),
    positionLengthControl('translate_x', 'translate-x'),
    positionLengthControl('translate_y', 'translate-y'),
    positionLengthControl('translate_z')
  ] },
  spacingSection('padding', 'p'),
  spacingSection('margin', 'm'),
  { id: 'opacity', controls: [control('opacity', [], {
    pattern: /^opacity-.+$/,
    options: [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]
      .map(value => ({ value: `opacity-${value}`, label: `${value}%` }))
  })] },
  { id: 'shadow', controls: [control('shadow_token', [], {
    options: Object.entries(shadows).map(([name, value]) => ({
      value: `shadow-${name}`,
      label: value === 'none' ? 'zx_builder_style_shadow_none' : name,
      modeLabel: value === 'none' ? null : /\binset\b/.test(value)
        ? 'zx_builder_style_shadow_inset' : 'zx_builder_style_shadow_outset'
    }))
  })] },
  { id: 'blur', controls: [
    ...['blur', 'backdrop-blur'].map(prefix => control(prefix === 'blur' ? 'blur_normal' : 'blur_backdrop', [], {
      options: Object.entries(blur).map(([name, value]) => ({
        value: `${prefix}-${name}`, label: `${name} · ${value}`
      }))
    }))
  ] },
  { id: 'text', controls: [
    control('typography', Object.keys(typography.styles).map(name => `text-${name}`)),
    colorControl('text_color', 'text')
  ] },
  { id: 'fill', controls: [
    colorControl('background', 'bg'),
    control('gradient', ['bg-none', ...Object.keys(gradients).map(key => `bg-${key}`), ...['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'].map(direction => `bg-gradient-to-${direction}`)], { pattern: /^bg-(?:none|gradient-.+)$/ }),
    colorControl('from', 'from'), colorControl('via', 'via'), colorControl('to', 'to')
  ] },
  { id: 'border', controls: borderSides, globalControls: borderGlobals.map(base => ({
    ...base, globalSides: borderSides.filter(side => side.id.startsWith(base.id + '_'))
  })) },
  { id: 'rounding', controls: radiusCorners, globalControls: [
    { ...radiusControl(), globalSides: radiusCorners }
  ] }
];
