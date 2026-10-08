import DOMPurify from 'dompurify';

export function sanitizeRichText(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col'],
    ALLOWED_ATTR: ['start', 'colspan', 'rowspan', 'colwidth', 'span', 'href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false
  });
}

// Link targets: web, mail, phone, in-page anchors and relative paths. Other schemes are refused.
export function richTextHref(value) {
  const href = String(value ?? '').trim();
  if (!href || /\s/.test(href)) return null;
  // Bare hosts ("example.com/page", "example.com:8080") would otherwise be relative paths or schemes.
  if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#:]|$)/i.test(href) && !href.includes('://')) return `https://${href}`;
  if (/^[^@/?#:]+@[^@/?#:]+\.[a-z]{2,}$/i.test(href)) return `mailto:${href}`;
  const scheme = href.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && !['http', 'https', 'mailto', 'tel'].includes(scheme)) return null;
  return href;
}

export function richTextContent(value) {
  // Plain text line breaks remain visible when opening the visual editor.
  if (!/<\/?[a-z][^>]*>/i.test(value)) {
    const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<p>${escaped.replace(/\r\n?|\n/g, '<br>')}</p>`;
  }
  return sanitizeRichText(value);
}
