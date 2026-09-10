import DOMPurify from 'dompurify';

export function sanitizeRichText(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'blockquote', 'code', 'h2', 'h3', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col'],
    ALLOWED_ATTR: ['start', 'colspan', 'rowspan', 'colwidth', 'span'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false
  });
}

export function richTextContent(value) {
  // Plain text line breaks remain visible when opening the visual editor.
  if (!/<\/?[a-z][^>]*>/i.test(value)) {
    const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<p>${escaped.replace(/\r\n?|\n/g, '<br>')}</p>`;
  }
  return sanitizeRichText(value);
}
