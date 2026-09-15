import breakpoints from '../../vendor/zaux/style/tokens/breakpoints.json';

export const sliderBreakpoints = Object.entries(breakpoints)
  .map(([name, width]) => ({ name, width: parseFloat(width) }))
  .filter(item => item.width > 0);

const singleProps = {
  fullViewPort: false, slideRatio: '', slides: [],
  customSliderParams: { slidesPerView: 1, spaceBetween: 0, speed: 300, loop: false, pagination: { clickable: true } }
};

export const sliderControls = {
  SliderSingle: {
    props: singleProps,
    fields: [
      { path: 'enableNavBtn', label: 'zx_builder_slider_arrows', type: 'switch', default: true },
      { path: 'fullViewPort', label: 'zx_builder_slider_slide_viewport', type: 'switch', default: true }
    ],
  },
  HeroSliderSection: {
    contentPath: 'sliderContent',
    props: { fullViewPort: false, fullHeightClass: '', enableNavBtn: false, sliderContent: { ...singleProps } },
    fields: [
      { path: 'enableNavBtn', label: 'zx_builder_slider_arrows', type: 'switch', default: false },
      { path: 'fullViewPort', label: 'zx_builder_slider_section_viewport', type: 'switch', default: true },
      { path: 'sliderContent.fullViewPort', label: 'zx_builder_slider_slide_viewport', type: 'switch', default: true }
    ]
  },
  SliderMultiple: {
    props: { slides: [], overrideDefaultParams: true, customSliderParams: { slidesPerView: 1, spaceBetween: 16, speed: 300, loop: false, pagination: { clickable: true }, breakpoints: { [parseFloat(breakpoints.md)]: { slidesPerView: 3, spaceBetween: 24 } } } },
    fields: [{ path: 'hideCtrls', label: 'zx_builder_slider_hide_arrows', type: 'switch', default: false }],
  }
};

export const layoutFields = [
  { path: 'slidesPerView', label: 'zx_builder_slider_visible', type: 'number', min: 0.1 },
  { path: 'spaceBetween', label: 'zx_builder_slider_gap', type: 'number', min: 0 },
  { path: 'slidesPerGroup', label: 'zx_builder_slider_group', type: 'number', min: 1, integer: true }
];
export const behaviorFields = [
  { path: 'loop', label: 'zx_builder_slider_loop', type: 'switch', default: false },
  { path: 'speed', label: 'zx_builder_slider_speed', type: 'number', min: 0, default: 300 },
  { path: 'pagination.enabled', label: 'zx_builder_slider_pagination', type: 'switch', default: true }
];
