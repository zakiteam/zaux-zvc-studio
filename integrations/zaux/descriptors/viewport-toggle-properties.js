import breakpoints from '../../../vendor/zaux/style/tokens/breakpoints.json';

const label = key => ({ labelKey: 'zx_builder_vp_' + key });
const hint = key => ({ hintKey: 'zx_builder_vp_' + key });
const choice = (value, key) => ({ value, labelKey: 'zx_builder_vp_' + key });
const select = options => ({ control: 'select', options });

// Values and semantics come from ViewportToggle.vue and its shared story args.
export const viewportToggleDecorators = {
  mode: { ...label('mode'), ...select([choice('slot', 'slot'), choice('target', 'target')]), ...hint('mode_hint') },
  inClass: { ...label('inClass'), control: 'text', ...hint('classes_hint') },
  outClass: { ...label('outClass'), control: 'text', ...hint('classes_hint') },
  threshold: { ...label('threshold'), ...hint('threshold_hint') },
  // Empty strings are the native automatic/inherited setting. String, number,
  // array and null values remain supported by the ordinary property editor.
  enterThreshold: { ...label('enterThreshold'), ...hint('enter_hint') },
  exitThreshold: { ...label('exitThreshold'), ...hint('exit_hint') },
  thresholdReference: { ...label('reference'), ...select([choice('element', 'element'), choice('viewport-area', 'viewport')]), ...hint('reference_hint') },
  thresholdAxis: { ...label('axis'), ...select([choice('y', 'vertical'), choice('x', 'horizontal')]), ...hint('axis_hint') },
  thresholdDirection: { ...label('direction'), ...select([choice('ltr', 'ltr'), choice('rtl', 'rtl')]), ...hint('direction_hint') },
  repeat: { ...label('repeat'), ...hint('repeat_hint') },
  disableBelow: {
    ...label('disableBelow'), ...hint('disable_hint'),
    ...select([choice('', 'no_breakpoint'), ...Object.entries(breakpoints).map(([value, width]) => ({ value, label: `${value} (${width})` }))]),
  },
  honorReducedMotion: { ...label('reducedMotion'), ...hint('reduced_hint') },
  wait: { ...label('wait'), ...select([choice('', 'immediate'), choice('load', 'load')]) },
  delay: { ...label('delay'), ...hint('delay_hint') },
  targetAttr: { ...label('targetAttr'), control: 'text', ...hint('target_hint') },
};

// Mirror the existing opt-in lightbox marker: expose the standard marker and
// any custom target attribute used by a controller in the current document.
export function viewportTargetDescriptors(trees = []) {
  const attributes = new Set(['data-zx-vp-toggle']);
  function visit(nodes) {
    for (const node of nodes) {
      const attribute = node.props?.targetAttr;
      if (node.name === 'ViewportToggle' && node.props?.mode !== 'slot' && typeof attribute === 'string' && /^data-[a-zA-Z0-9_-]+$/.test(attribute)) attributes.add(attribute);
      visit(node.children ?? []);
    }
  }
  trees.forEach(visit);
  return Object.fromEntries([...attributes].map(attribute => [attribute, {
    type: String, default: '', ...hint('marker_hint'),
  }]));
}
