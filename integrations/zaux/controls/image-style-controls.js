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
