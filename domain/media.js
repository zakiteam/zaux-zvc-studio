// Recognize URL fields only; object-valued image settings keep their JSON editor.
export function isImageField(key, value) {
  return (value === undefined || value === null || typeof value === 'string')
    && /(^|\.)(src|fallbackSrc|image|imageUrl|imageSrc|imgSrc|backgroundImage|poster)$/i.test(key ?? '');
}
