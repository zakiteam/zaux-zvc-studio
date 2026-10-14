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
import ratios from '../../../vendor/zaux/style/tokens/ratios.json';
import easings from '../../../vendor/zaux/style/tokens/easings.json';

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
// Editor baselines for layout controls without an explicit authored utility.
// These become ordinary Tailwind classes only when a responsive edit needs them.
const responsiveLayoutDefaults = {
  direction: 'flex-row',
  wrap: 'flex-nowrap',
  align: 'items-stretch',
  justify: 'justify-normal'
};
function illustratedControl(id, values, matchValues = values) {
  return control(id, values, {
    illustrated: true,
    matchValues,
    responsiveDefault: responsiveLayoutDefaults[id],
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

// Transform and filter controls offer only Tailwind 3 theme steps (Zaux keeps the defaults,
// except blur, which uses its tokens): no free values. A hand-typed arbitrary class reads as
// "Custom". Every control has its own pattern and no conflict matching, so scale never reads
// scale-x and a filter never reads its backdrop twin.
const opacitySteps = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];
const percent = value => `${value}%`;
const degrees = value => `${value}°`;
// signed: also the negative steps (-rotate-45), listed from the most negative.
function stepControl(id, prefix, steps, format, { pattern, signed = false, extra = [], label } = {}) {
  const values = signed ? [...steps.filter(Boolean).map(value => -value).reverse(), ...steps] : steps;
  return control(id, [], {
    ...(label ? { label } : {}),
    pattern: pattern ?? new RegExp(`^${signed ? '-?' : ''}${prefix}-.+$`),
    matchValues: [],
    options: [
      ...values.map(value => ({ value: `${value < 0 ? '-' : ''}${prefix}-${Math.abs(value)}`, label: format(value) })),
      ...extra
    ]
  });
}
// grayscale, sepia and invert: Tailwind has only the full effect and 0.
function toggleFilterControl(id, prefix, label) {
  return control(id, [], {
    ...(label ? { label } : {}),
    pattern: new RegExp(`^${prefix}(?:-.+)?$`),
    matchValues: [],
    options: [
      { value: prefix, label: 'zx_builder_style_filter_on' },
      { value: `${prefix}-0`, label: 'zx_builder_style_filter_off' }
    ]
  });
}
const flip = axis => ({ value: `-scale-${axis}-100`, label: 'zx_builder_style_scale_flip' });
const scaleSteps = [0, 50, 75, 90, 95, 100, 105, 110, 125, 150];
// Same points as the image position grid, so its icons are reused.
const originPoints = { 'top-left': 'left-top', top: 'top', 'top-right': 'right-top', left: 'left', center: 'center', right: 'right', 'bottom-left': 'left-bottom', bottom: 'bottom', 'bottom-right': 'right-bottom' };
// Filter controls for `filter` (prefix '') or `backdrop-filter` (prefix 'backdrop-').
// Backdrop controls reuse the filter labels: their section names the target.
function filterControls(prefix) {
  const id = name => prefix ? `backdrop_${name}` : name;
  const label = name => prefix ? `zx_builder_style_${name}` : undefined;
  return [
    stepControl(id('brightness'), `${prefix}brightness`, [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200], percent, { label: label('brightness') }),
    stepControl(id('contrast'), `${prefix}contrast`, [0, 50, 75, 100, 125, 150, 200], percent, { label: label('contrast') }),
    stepControl(id('saturate'), `${prefix}saturate`, [0, 50, 100, 150, 200], percent, { label: label('saturate') }),
    stepControl(id('hue_rotate'), `${prefix}hue-rotate`, [0, 15, 30, 60, 90, 180], degrees, { signed: true, label: label('hue_rotate') }),
    toggleFilterControl(id('grayscale'), `${prefix}grayscale`, label('grayscale')),
    toggleFilterControl(id('sepia'), `${prefix}sepia`, label('sepia')),
    toggleFilterControl(id('invert'), `${prefix}invert`, label('invert'))
  ];
}
// Transitions: Tailwind 3 defaults plus the Zaux easing and duration tokens (theme.extend).
// Delay has no Zaux tokens. `transition` alone animates colors, opacity, shadow and transforms.
const transitionSteps = [0, 75, 100, 150, 200, 300, 500, 700, 1000];
const durationSteps = [...new Set([...transitionSteps, ...Object.keys(easings.transitionDuration).map(Number)])].sort((a, b) => a - b);
const transitionControls = [
  control('transition_property', [], {
    pattern: /^transition(?:-.+)?$/,
    matchValues: [],
    options: ['', 'all', 'colors', 'opacity', 'shadow', 'transform', 'none'].map(name => ({
      value: name ? `transition-${name}` : 'transition',
      label: `zx_builder_style_transition_${name || 'default'}`
    }))
  }),
  stepControl('duration', 'duration', durationSteps, value => `${value}ms`),
  control('easing', [], {
    pattern: /^ease-.+$/,
    matchValues: [],
    options: [
      ...['linear', 'in', 'out', 'in-out'].map(name => ({ value: `ease-${name}`, label: `zx_builder_style_easing_${name.replace('-', '_')}` })),
      ...Object.keys(easings.timingFunctions).map(name => ({ value: `ease-${name}`, label: name, modeLabel: 'zx_builder_style_zaux_token' }))
    ]
  }),
  stepControl('delay', 'delay', transitionSteps, value => `${value}ms`)
];
const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
const blurControl = prefix => control(prefix === 'blur' ? 'blur_normal' : 'blur_backdrop', [], {
  options: Object.entries(blur).map(([name, value]) => ({
    value: `${prefix}-${name}`, label: `${name} · ${value}`
  }))
});

// Global view: all sides, then the X (right + left) and Y (top + bottom) axes.
function spacingSection(id, prefix) {
  const sides = ['t', 'r', 'b', 'l'].map(side => spaceControl(`${prefix}${side}`));
  const axis = (name, edges) => ({
    ...spaceControl(`${prefix}${name}`, `${id}_${name}`),
    label: `zx_builder_style_${id}`, sideLabel: `zx_builder_style_side_${name}`,
    globalAxis: name, globalSides: sides.filter(side => edges.includes(side.prefix.slice(-1)))
  });
  return { id, controls: sides, globalControls: [
    { ...spaceControl(prefix, id), globalSides: sides },
    axis('x', ['r', 'l']),
    axis('y', ['t', 'b'])
  ] };
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
    // Grid line where the item starts (Tailwind col-start-1…13; 13 is the end line of a 12-column grid).
    control('col_start', [], {
      pattern: /^col-start-.+$/,
      options: [
        ...Array.from({ length: 13 }, (_, index) => ({ value: `col-start-${index + 1}`, label: String(index + 1) })),
        { value: 'col-start-auto', label: 'zx_builder_style_col_start_auto' }
      ]
    }),
    control('order', ['order-first', ...Array.from({ length: 12 }, (_, index) => `order-${index + 1}`), 'order-last', 'order-none'], { pattern: /^-?order-.+$/ })
  ] },
  { id: 'dimensions', controls: [
    control('container', Object.keys(containers).map(selector => selector.slice(1)), { pattern: /^container(?:-.+)?$/ }),
    dimensionControl('width', 'w'), dimensionControl('height', 'h'),
    dimensionControl('min_width', 'min-w'), dimensionControl('min_height', 'min-h'),
    dimensionControl('max_width', 'max-w'), dimensionControl('max_height', 'max-h')
  ] },
  // Zaux replaces Tailwind's aspectRatio scale with these tokens (aspect-16-9, …).
  { id: 'aspect_ratio', controls: [control('aspect_ratio', [], {
    options: Object.entries(ratios).map(([key, value]) => ({ value: `aspect-${key}`, label: value.replace('/', ':') }))
  })] },
  { id: 'positioning', controls: [
    control('position', ['static', 'relative', 'fixed', 'absolute'], { matchValues: ['static', 'relative', 'fixed', 'absolute', 'sticky'] }),
    control('z_index', [], {
      integer: true,
      prefix: 'z',
      pattern: /^-?z-.+$/,
      options: ['auto', 0, 10, 20, 30, 40, 50].map(value => ({ value: `z-${value}`, label: String(value) }))
    }),
    ...['top', 'right', 'bottom', 'left'].map(side => positionLengthControl(side))
  ] },
  { id: 'transform', controls: [
    positionLengthControl('translate_x', 'translate-x'),
    positionLengthControl('translate_y', 'translate-y'),
    positionLengthControl('translate_z'),
    stepControl('scale', 'scale', scaleSteps, percent, { pattern: /^-?scale-(?![xy]-).+$/ }),
    stepControl('scale_x', 'scale-x', scaleSteps, percent, { extra: [flip('x')], pattern: /^-?scale-x-.+$/ }),
    stepControl('scale_y', 'scale-y', scaleSteps, percent, { extra: [flip('y')], pattern: /^-?scale-y-.+$/ }),
    stepControl('rotate', 'rotate', [0, 1, 2, 3, 6, 12, 45, 90, 180], degrees, { signed: true }),
    stepControl('skew_x', 'skew-x', [0, 1, 2, 3, 6, 12], degrees, { signed: true }),
    stepControl('skew_y', 'skew-y', [0, 1, 2, 3, 6, 12], degrees, { signed: true }),
    control('origin', [], {
      illustrated: true,
      columns: 3,
      pattern: /^origin-.+$/,
      matchValues: [],
      options: Object.entries(originPoints).map(([point, icon]) => ({
        value: `origin-${point}`, label: `zx_builder_style_origin_${point.replace('-', '_')}`,
        icon: `/assets/builder/object-position-${icon}.svg`
      }))
    })
  ] },
  spacingSection('padding', 'p'),
  spacingSection('margin', 'm'),
  { id: 'opacity', controls: [control('opacity', [], {
    pattern: /^opacity-.+$/,
    options: opacitySteps.map(value => ({ value: `opacity-${value}`, label: `${value}%` }))
  })] },
  { id: 'shadow', controls: [control('shadow_token', [], {
    options: Object.entries(shadows).map(([name, value]) => ({
      value: `shadow-${name}`,
      label: value === 'none' ? 'zx_builder_style_shadow_none' : name,
      modeLabel: value === 'none' ? null : /\binset\b/.test(value)
        ? 'zx_builder_style_shadow_inset' : 'zx_builder_style_shadow_outset'
    }))
  })] },
  // drop-shadow is left out: Zaux maps it to the box-shadow tokens, whose spread value
  // is invalid in drop-shadow().
  { id: 'filter', controls: [blurControl('blur'), ...filterControls('')] },
  { id: 'backdrop', controls: [
    blurControl('backdrop-blur'),
    ...filterControls('backdrop-'),
    stepControl('backdrop_opacity', 'backdrop-opacity', opacitySteps, percent, { label: 'zx_builder_style_opacity' })
  ] },
  // Blend modes: mix-blend (element over what is behind it) and bg-blend (between its own
  // background layers, e.g. image and color). Tailwind 3 values; plus-lighter is mix only.
  { id: 'blend', controls: [
    control('mix_blend', [], {
      pattern: /^mix-blend-.+$/,
      matchValues: [],
      options: [...blendModes, 'plus-lighter'].map(name => ({ value: `mix-blend-${name}`, label: `zx_builder_style_blend_${name.replaceAll('-', '_')}` }))
    }),
    control('bg_blend', [], {
      pattern: /^bg-blend-.+$/,
      matchValues: [],
      options: blendModes.map(name => ({ value: `bg-blend-${name}`, label: `zx_builder_style_blend_${name.replaceAll('-', '_')}` }))
    })
  ] },
  { id: 'transition', controls: transitionControls },
  { id: 'text', controls: [
    control('typography', Object.keys(typography.styles).map(name => `text-${name}`)),
    colorControl('text_color', 'text'),
    // Tailwind's default weight scale: Zaux tokens extend fontFamily only.
    control('font_weight', [], {
      options: ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']
        .map((name, index) => ({ value: `font-${name}`, label: `zx_builder_style_font_weight_${name}`, modeLabel: String((index + 1) * 100) }))
    }),
    control('font_style', [], {
      options: [
        { value: 'italic', label: 'zx_builder_style_font_style_italic' },
        { value: 'not-italic', label: 'zx_builder_style_font_style_normal' }
      ]
    }),
    control('text_decoration', [], {
      options: ['underline', 'overline', 'line-through', 'no-underline']
        .map(value => ({ value, label: `zx_builder_style_text_decoration_${value.replace('-', '_')}` }))
    }),
    control('decoration_style', [], {
      options: ['solid', 'double', 'dotted', 'dashed', 'wavy']
        .map(name => ({ value: `decoration-${name}`, label: `zx_builder_style_decoration_style_${name}` }))
    }),
    // matchValues stays empty: tailwind-merge lets line-clamp override display/overflow,
    // which must not make those classes read as a clamp value.
    control('line_clamp', [], {
      integer: true,
      positive: true,
      prefix: 'line-clamp',
      pattern: /^line-clamp-.+$/,
      matchValues: [],
      placeholder: 'zx_builder_style_line_clamp_placeholder',
      invalid: 'zx_builder_style_line_clamp_invalid',
      options: [
        ...[1, 2, 3, 4, 5, 6].map(value => ({ value: `line-clamp-${value}`, label: String(value) })),
        { value: 'line-clamp-none', label: 'zx_builder_style_line_clamp_none' }
      ]
    })
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
