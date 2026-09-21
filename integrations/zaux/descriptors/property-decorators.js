import { videoProperties, imageProperties } from './media-properties.js';
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
  IntroText: { subtitle: { control: 'textarea' }, ctas : { control : 'buttongroup'} },
  Icon: {
    iconSet: selectOptions(Object.keys(iconSets)),
    iconName: ({ props }) => {
      const set = props.iconSet === undefined ? 'zaux' : props.iconSet;
      return selectOptions(typeof set === 'string' && Object.hasOwn(iconSets, set) ? iconSets[set] : []);
    },
    size: selectOptions(iconSizes)
  },
  ResponsiveProps : { componentName : selectOptions(palette.map(entry => entry.name)) },
  Videoplayer: {
    size: selectOptions(['s', 'm']),
    theme: selectOptions(['light1']),
    rounded: selectOptions([null, true, false]),
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
  Accordion : { content : { control : 'textarea' } },
  // The `media` prop of these components carries a Media.vue-style object
  // ({ type, props }); the shared BuilderMediaInput edits it compactly. Opt-in
  // per component so other `media` props keep their ordinary editor.
  Card: { media: { media: true } },
  CardMediaBox: { media: { media: true } },
  CardPic: { media: { media: true } },
  ZFigure: { media: { media: true } },
  Usermeta: { media: { media: true } },
  DisplayBox: { media: { media: true } },
  FeatBannerSection: { media: { media: true } },
  SectionSplit: { media: { media: true } },
  SectionSplitIntro: { media: { media: true } },
  SectionSplitWide: { media: { media: true } }
};

export function decorateProperties(name, descriptors, { props = {}, trees = [] } = {}) {
  const result = { ...descriptors };
  const decorations = {
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