import { videoProperties, imageProperties } from './media-properties.js';
import { motionDecorators } from './motion-properties.js';
import { viewportToggleDecorators } from './viewport-toggle-properties.js';
import { componentSelects } from '../options/component-options.js';
import { iconSets, iconSizes } from '../options/icon-options.js';
import palette from '../../../app/data/catalog/palette.js';

// A decoration adds editor metadata; it never writes to the node's props.
export function selectOptions(values) {
  return {
    control: 'select',
    options: values.map(value => value !== null && typeof value === 'object'
      ? { value: value.value, label: value.label ?? String(value.value) }
      : { value, label: String(value) })
  };
}

function panelOptions(trees, component, property) {
  const options = new Map();
  function collect(nodes) {
    for (const node of nodes) {
      const id = node.props?.[property];
      if (node.name === component && typeof id === 'string' && id) {
        const title = typeof node.props.title === 'string' && node.props.title ? node.props.title : node.name;
        options.set(id, { value: id, label: title + ' (' + id + ')' });
      }
      collect(node.children ?? []);
    }
  }
  trees.forEach(collect);
  return selectOptions([...options.values()]);
}

// Extension point: component name -> prop name -> descriptor patch or context function.
// Context functions run inside the Inspector computed, so their dependencies stay reactive.
export const propertyDecorators = {
  ViewportToggle: viewportToggleDecorators,
  ...motionDecorators,
  IntroText: { subtitle: { control: 'textarea' }, ctas : { control : 'buttongroup'} },
  IntroDesc: {
    subtitle: { control: 'textarea' },
    ctas: { control: 'buttongroup' },
    headAlignment: selectOptions(['left', 'center', 'right']),
    // RichText props; other RichText keys (theme, size…) stay editable as extra nested keys.
    excerpt: { default: { contentHTML: '' }, properties: { contentHTML: { type: String, default: '' } } }
  },
  Icon: {
    iconSet: selectOptions(Object.keys(iconSets)),
    // Icon.vue renders the global UI set, so the picker lists and previews that set.
    iconName: { control: 'icon' },
    size: selectOptions(iconSizes)
  },
  ResponsiveProps : { componentName : selectOptions(palette.map(entry => entry.name)) },
  Videoplayer: {
    size: selectOptions(['s', 'm']),
    theme: selectOptions(['light1']),
    // rounded (default null) uses the shared default/yes/no choice.
    // Videoplayer always enables pauseOnClick on its child Zvideo.
    video: { properties: Object.fromEntries(Object.entries(videoProperties).filter(([key]) => key !== 'pauseOnClick')) }
  },
  Media: {
    type: selectOptions(['img', 'video']),
    props: ({ props }) => ({ properties: props.type === 'video' ? videoProperties : props.type === undefined || props.type === 'img' ? imageProperties : undefined })
  },
  Zimg: { src: { image: true }, fallbackSrc: { image: true } },
  img: { src: { image: true } },
  video: { poster: { image: true } },
  a: {
    href: { type: String, default: '#' },
    id: { type: String, default: '' },
    target: { type: String, default: '_self', ...selectOptions(['_self', '_blank', '_parent', '_top']) },
    rel: { type: String, default: '' }
  },
  OffCanvasTrigger: {
    offCanvasId: ({ trees }) => panelOptions(trees, 'OffCanvas', 'offCanvasId')
  },
  ZModalTrigger: {
    modalId: ({ trees }) => panelOptions(trees, 'ZModal', 'modalId')
  },
  // Each item is a Snippetlabel entry; `type: 'option'` renders a button that emits `selected` with the item.
  Dropdown: {
    items: {
      items: {
        default: { type: 'link', title: '', excerpt: '', icon: 'media', href: '#' },
        properties: {
          type: { default: 'link', type: String, ...selectOptions(['link', 'option']) },
          title: { default: '', type: String },
          excerpt: { default: '', type: String },
          icon: { default: '', type: String, control: 'icon', allowEmpty: true },
          href: { default: '', type: String },
          value: { default: '', type: String }
        }
      }
    }
  },
  Accordion : { content : { control : 'textarea' } },
  // control: 'classes' edits a class string with BuilderStyleInput (Tailwind suggestions and CSS preview).
  ScrollTopSentinel: { scrolledClasses: { control: 'classes' }, unScrolledClasses: { control: 'classes' } },
  // The `media` prop of these components carries a Media.vue-style object
  // ({ type, props }); the shared BuilderMediaInput edits it compactly. Opt-in
  // per component so other `media` props keep their ordinary editor.
  Card: { media: { media: true } },
  CardMediaBox: { media: { media: true } },
  CardPic: { media: { media: true } },
  ZFigure: { media: { media: true } },
  Usermeta: {
    media: { media: true },
    // href defaults to false upstream; a string keeps the text editor (empty = no link).
    href: { type: String, default: '' },
    // cta defaults to false; added from "Add property" it starts as a ZButton-like object.
    cta: {
      default: { label: '', href: '#' },
      hintKey: 'zx_builder_usermeta_cta_hint',
      properties: {
        label: { type: String, default: '' },
        href: { type: String, default: '#' },
        icon: { type: String, default: '', control: 'icon', allowEmpty: true },
        theme: { type: String, default: 'alt1' }
      }
    }
  },
  DisplayBox: { media: { media: true } },
  FeatBannerSection: { media: { media: true } },
  SectionSplit: { media: { media: true } },
  SectionSplitIntro: { media: { media: true } },
  SectionSplitWide: { media: { media: true } },
  // introContent renders one { type: 'component', name, props } descriptor above the
  // slides; the component field editor picks and edits it (null = no intro content).
  SliderMultiple: { introContent: { control: 'component' } },
  // Repeater entries (domain/repeater.js); a bound value is edited by the Repeater panel.
  ComponentsRenderer: { components: { control: 'component' } }
};

// String props named iconName or <something>IconName (plus the icon props of
// Snippetlabel, Dropdown, Accordion and inputs) hold a symbol of the active icon set.
const ICON_NAME_PROPERTY = /^(?:(?:i|.+I)conName|icon|titleIcon|openIcon|closeIcon)$/;
const isText = descriptor => descriptor?.type === String || typeof descriptor?.default === 'string';
const iconNameDecorations = descriptors => Object.fromEntries(Object.entries(descriptors)
  .filter(([property, descriptor]) => ICON_NAME_PROPERTY.test(property) && isText(descriptor))
  .map(([property]) => [property, { control: 'icon', allowEmpty: true }]));

// Shared conventions of Zaux props, applied only where neither upstream metadata
// nor an explicit rule already chose a control:
// - titleTag/eyeletTag/excerptTag… choose the rendered element;
// - rounded/pilled default to null (theme decides), so null stays a choice;
// - align is a left/center/right string;
// - <something>Classes / containerClass hold class strings (Tailwind assistance).
const TAG_PROPERTY = /.Tag$/;
const TRISTATE_PROPERTY = /^(?:rounded|pilled|dotsRounded|roundedMedia)$/;
const CLASS_PROPERTY = /^(?:classes|customClasses|.+Class(?:es)?)$/;
const tristate = {
  control: 'select',
  options: [
    { value: null, labelKey: 'zx_builder_option_theme_default' },
    { value: true, labelKey: 'zx_builder_yes' },
    { value: false, labelKey: 'zx_builder_no' }
  ]
};
function conventionDecorations(descriptors) {
  const result = {};
  for (const [property, descriptor] of Object.entries(descriptors)) {
    if (descriptor?.options || descriptor?.control) continue;
    if (TAG_PROPERTY.test(property) && isText(descriptor)) result[property] = selectOptions(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span']);
    else if (TRISTATE_PROPERTY.test(property) && descriptor?.default === null) result[property] = tristate;
    else if (property === 'align' && isText(descriptor)) result[property] = selectOptions(['left', 'center', 'right']);
    else if (CLASS_PROPERTY.test(property) && (isText(descriptor) || descriptor?.default === null)) result[property] = { control: 'classes' };
  }
  return result;
}

export function decorateProperties(name, descriptors, { props = {}, trees = [] } = {}) {
  const result = { ...descriptors };
  const decorations = {
    ...conventionDecorations(descriptors),
    ...iconNameDecorations(descriptors),
    ...Object.fromEntries(Object.entries(componentSelects[name] ?? {})
      .filter(([property]) => Object.hasOwn(descriptors, property))
      .map(([property, values]) => [property, selectOptions(values)])),
    ...propertyDecorators[name]
  };
  for (const [property, decoration] of Object.entries(decorations)) {
    const context = { name, property, props, trees, descriptor: result[property] ?? {} };
    const patch = typeof decoration === 'function' ? decoration(context) : decoration;
    result[property] = { ...result[property], ...patch };
  }
  return result;
}
