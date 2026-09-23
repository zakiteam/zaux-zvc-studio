import HoverMagnet from '../../../vendor/zaux/core/components/utils/microinteraction/interactions/HoverMagnet.vue';
import MouseParallax from '../../../vendor/zaux/core/components/utils/microinteraction/interactions/MouseParallax.vue';
import ScrollParallax from '../../../vendor/zaux/core/components/utils/microinteraction/interactions/ScrollParallax.vue';
import breakpoints from '../../../vendor/zaux/style/tokens/breakpoints.json';

const choice = (value, labelKey) => ({ value, labelKey });
const select = options => ({ control: 'select', options });
const label = key => ({ labelKey: 'zx_builder_motion_' + key });
const breakpointOptions = [choice(null, 'zx_builder_motion_no_breakpoint'), ...Object.entries(breakpoints).map(([value, width]) => ({ value, label: `${value} (${width})` }))];
const breakpoint = { ...select(breakpointOptions), ...label('breakpoint') };
const tags = select(['div', 'span', 'section'].map(value => ({ value, label: value })));

// Copy scalar declarations only; never execute component default functions.
function fields(component, keys) {
  return Object.fromEntries(keys.map(key => [key, { ...component.props[key], ...label(key) }]));
}
const common = ['tag', 'isDisabled', 'mobileBP'];
const interactions = {
  HoverMagnet: {
    ...fields(HoverMagnet, [...common, 'reducer', 'magnetRange', 'transitionCSS']),
    tag: { ...HoverMagnet.props.tag, ...tags, ...label('tag') },
  },
  MouseParallax: {
    ...fields(MouseParallax, [...common, 'range', 'intensifier', 'useMotionSensor', 'honorReducedMotion']),
    tag: { ...MouseParallax.props.tag, ...tags, ...label('tag') },
  },
  ScrollParallax: {
    ...fields(ScrollParallax, ['tag', 'isDisabled', 'speed', 'reverse', 'direction', 'disableBelow', 'honorReducedMotion', 'easing', 'duration']),
    tag: { ...ScrollParallax.props.tag, ...tags, ...label('tag') },
    direction: { ...ScrollParallax.props.direction, ...select([choice('x', 'zx_builder_motion_horizontal'), choice('y', 'zx_builder_motion_vertical')]), ...label('direction') },
    disableBelow: { ...breakpoint, default: null },
    limit: {
      ...label('limit'), default: null,
      ...select([choice(null, 'zx_builder_motion_unlimited'), choice({ min: -100, max: 100 }, 'zx_builder_motion_bounded')]),
      properties: { min: { type: Number, default: 0, ...label('min') }, max: { type: Number, default: 100, ...label('max') } },
    },
  },
};

function selectors(trees, ownPosition) {
  const options = [choice('', ownPosition ? 'zx_builder_motion_own_start' : 'zx_builder_motion_no_end')];
  const ids = new Set();
  function walk(nodes) {
    for (const node of nodes) {
      const id = node.props?.id;
      // Keep complex selectors available through the existing custom editor.
      if (typeof id === 'string' && /^[A-Za-z_][\w-]*$/.test(id) && !ids.has(id)) {
        ids.add(id); options.push({ value: '#' + id, label: '#' + id + ' (' + node.name + ')' });
      }
      walk(node.children ?? []);
    }
  }
  trees.forEach(walk);
  return select(options);
}

export const motionDecorators = {
  MicroInteraction: {
    name: { ...label('effect'), ...select([
      choice('HoverMagnet', 'zx_builder_motion_magnet'),
      choice('MouseParallax', 'zx_builder_motion_mouse'),
      choice('ScrollParallax', 'zx_builder_motion_scroll'),
    ]), hintKey: 'zx_builder_motion_content_hint' },
    props: ({ props }) => ({ ...label('settings'), properties: Object.hasOwn(interactions, props.name) ? interactions[props.name] : undefined, hintKey: 'zx_builder_motion_settings_hint' }),
  },
  ZRevealOnScroll: {
    startSelector: ({ trees }) => ({ ...selectors(trees, true), ...label('start'), hintKey: 'zx_builder_motion_start_hint' }),
    endSelector: ({ trees }) => ({ ...selectors(trees, false), ...label('end') }),
    endTriggerPosition: { ...label('end_position'), ...select([choice('top', 'zx_builder_motion_top'), choice('bottom', 'zx_builder_motion_bottom'), choice(null, 'zx_builder_motion_no_end')]) },
    disableAfter: { ...breakpoint, hintKey: 'zx_builder_motion_reveal_breakpoint_hint' },
    revealClass: { ...label('reveal_class'), control: 'text' },
    transitionName: { hintKey: 'zx_builder_motion_transition_hint' },
  },
};
