// Recognize URL fields only; object-valued image settings keep their JSON editor.
export function isImageField(key, value) {
  return (value === undefined || value === null || typeof value === 'string')
    && /(^|\.)(src|fallbackSrc|image|imageUrl|imageSrc|imgSrc|backgroundImage|poster)$/i.test(key ?? '');
}

// Media objects follow Media.vue's contract: a `type` (img/video) plus a `props`
// object forwarded to Zimg/Zvideo. The same shape is used by the `media` prop of
// Card, ZFigure, Usermeta, DisplayBox and the SectionSplit family, so a single
// editor can serve them all. Optional Media.vue root props (fillSpace,
// containerClasses, elementClasses) are preserved but not required.
const MEDIA_TYPES = ['img', 'video', 'videoplayer'];

export function mediaType(value) {
  const type = value && typeof value === 'object' && !Array.isArray(value) ? value.type : undefined;
  return MEDIA_TYPES.includes(type) ? type : 'img';
}

export function isMediaObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && (MEDIA_TYPES.includes(value.type)
      || (value.props && typeof value.props === 'object' && !Array.isArray(value.props)));
}

// The img element classes live on `elementClasses` when editing the Media
// component itself (Media.vue forwards them as Zimg.imgClasses) and on
// `props.imgClasses` for the generic `media` prop.
export function mediaClassSurface(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, 'elementClasses')
    ? 'elementClasses'
    : 'imgClasses';
}

const OBJECT_FITS = ['object-cover', 'object-contain', 'object-fill', 'object-none'];

export function hasClass(classes, token) {
  return Array.isArray(classes) && classes.includes(token);
}

export function setClass(classes, token, on) {
  const list = Array.isArray(classes) ? [...classes] : [];
  if (on && !list.includes(token)) list.push(token);
  if (!on) return list.filter(entry => entry !== token);
  return list;
}

export function setObjectFit(classes, fit) {
  const list = Array.isArray(classes) ? classes.filter(entry => !OBJECT_FITS.includes(entry)) : [];
  if (fit) list.push(fit);
  return list;
}
