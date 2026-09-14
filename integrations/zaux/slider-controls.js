import breakpoints from '../../vendor/zaux/style/tokens/breakpoints.json';

export const sliderBreakpoints = Object.entries(breakpoints)
  .map(([name, width]) => ({ name, width: parseFloat(width) }))
  .filter(item => item.width > 0);

export const sliderControls = {
  SliderSingle: {
    props: { fullViewPort: false, slideRatio: '', customSliderParams: { slidesPerView: 1, spaceBetween: 0, speed: 300, loop: false, pagination: { clickable: true } } },
    fields: [{ path: 'enableNavBtn', label: 'zx_builder_slider_arrows', type: 'switch', default: true }],
  },
  SliderMultiple: {
    props: { overrideDefaultParams: true, customSliderParams: { slidesPerView: 1, spaceBetween: 16, speed: 300, loop: false, pagination: { clickable: true }, breakpoints: { [parseFloat(breakpoints.md)]: { slidesPerView: 3, spaceBetween: 24 } } } },
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
