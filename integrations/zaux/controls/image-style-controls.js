// Zimg.vue applies imgClasses to its inner img and class to its picture.
export function imageStyleTarget(name) {
  if (name === 'Zimg') return { property: 'imgClasses', defaults: ['object-cover', 'h-full', 'w-full'], array: true };
  if (name === 'img') return { property: 'class', defaults: '', array: false };
  return null;
}

export const imageFitControl = {
  id: 'object_fit',
  options: ['cover', 'contain', 'fill', 'none', 'scale-down'].map(value => ({
    value: `object-${value}`, label: `zx_builder_style_fit_${value}`
  }))
};

export const imagePositionControl = {
  id: 'object_position', prefix: 'object', length: true, objectPosition: true,
  pattern: /^object-\[.+\]$/,
  options: ['left-top', 'top', 'right-top', 'left', 'center', 'right', 'left-bottom', 'bottom', 'right-bottom'].map(value => ({
    value: `object-${value}`, label: `zx_builder_style_object_${value}`,
    icon: `/assets/builder/object-position-${value}.svg`
  }))
};

// "Cover the frame" toggle: w-full and h-full on the image. Outside the base scope
// turning it off writes w-auto/h-auto so a smaller breakpoint can undo it.
export const imageCoverControls = ['w', 'h'].map(prefix => ({
  id: `image_cover_${prefix}`,
  full: `${prefix}-full`, auto: `${prefix}-auto`,
  options: [{ value: `${prefix}-full` }, { value: `${prefix}-auto` }]
}));
