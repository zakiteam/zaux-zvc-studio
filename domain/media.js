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

// Library asset names: the file name without its extension. Generic browser
// clipboard names (image.png, blob…) return '' so the caller can pick a fallback.
export function mediaAssetName(fileName) {
  const name = String(fileName ?? '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/\s+/g, ' ').trim();
  return /^(image|blob|clipboard(-\d+)?|untitled)?$/i.test(name) ? '' : name.slice(0, 200);
}

export function isImageFile(file) {
  return !!file && (file.type.startsWith('image/') || /\.svg$/i.test(file.name ?? ''));
}

// SVG markup copied as text (design tools, code editors, inline HTML). Returns the
// standalone document, adding the namespaces inline SVG often omits and the image
// decoder requires, or null when the text is not a single SVG document.
export function svgMarkup(text) {
  const markup = String(text ?? '').replace(/^﻿/, '').trim();
  if (!/^(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>][\s\S]*<\/svg>$/i.test(markup)) return null;
  const root = markup.match(/<svg\b[^>]*>/i)[0];
  let attributes = '';
  if (!/\sxmlns\s*=/i.test(root)) attributes += ' xmlns="http://www.w3.org/2000/svg"';
  if (/\bxlink:/i.test(markup) && !/\sxmlns:xlink\s*=/i.test(root)) attributes += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
  return attributes ? markup.replace(/<svg\b/i, '<svg' + attributes) : markup;
}

export function svgTitle(markup) {
  return (markup.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
}
