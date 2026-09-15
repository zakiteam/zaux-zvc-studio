export function fontUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || value.length > 2048) throw new Error();
    return url.href;
  } catch { throw new Error('zx_builder_fonts_invalid'); }
}
export function fontEntry(value) {
  if (!value || typeof value.id !== 'string' || typeof value.family !== 'string' || typeof value.href !== 'string'
    || !value.family.trim() || value.family.length > 120 || /[;{}<>"'\\\r\n]/.test(value.family)) throw new Error('zx_builder_fonts_invalid');
  return { id: value.id, family: value.family.trim(), href: fontUrl(value.href) };
}
export function projectFonts(values = []) {
  if (!Array.isArray(values) || values.length > 100) throw new Error('zx_builder_fonts_invalid');
  const entries = values.map(fontEntry);
  if (new Set(entries.map(item => item.id)).size !== entries.length) throw new Error('zx_builder_fonts_invalid');
  return entries;
}
export function fontLinks(values) {
  const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return [...new Set(projectFonts(values).map(item => item.href))].map(href => '<link rel="stylesheet" href="' + escape(href) + '">').join('\n');
}
export function fontFiles(values = []) {
  const fonts = projectFonts(values);
  return fonts.length ? { 'fonts.json': JSON.stringify(fonts, null, 2), 'fonts.html': fontLinks(fonts) } : {};
}
