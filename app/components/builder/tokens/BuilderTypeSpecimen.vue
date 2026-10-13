<template>
  <iframe class="pointer-events-none block w-full border-none" sandbox="" loading="lazy" tabindex="-1" aria-hidden="true"
    :style="{ height: height + 'px' }" :title="title" :srcdoc="documentHtml" />
</template>
<script>
import { computed, defineComponent } from 'vue';

const PADDING = 16;
const META = 16;
const GAP = 4;
const ROW_GAP = 18;
const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Neutralize anything that could close the style element; token values are already validated CSS values.
const cssValue = value => String(value).replace(/</g, '\\3c ');
function pixels(value, fontSize) {
  const match = /^(-?[\d.]+)(rem|px|em)?$/.exec(String(value).trim());
  if (!match) return fontSize * 1.2;
  return Number(match[1]) * (match[2] === 'px' ? 1 : match[2] === 'em' ? fontSize : 16);
}

export default defineComponent({
  props: {
    family: { type: String, default: '' },
    // Typography styles from app/data/styles/tokens.js (name, fontSize, lineHeight, fontWeight, letterSpacing, fontStyle).
    styles: { type: Array, default: () => [] },
    // Project font snapshots ({ family, href }); loaded only inside this sandboxed document.
    fonts: { type: Array, default: () => [] },
    sample: { type: String, default: '' },
    title: { type: String, default: '' }
  },
  setup(props) {
    const rows = computed(() => props.styles.map(style => {
      const fontSize = pixels(style.fontSize, 16);
      return { ...style, height: Math.ceil(pixels(style.lineHeight, fontSize)) };
    }));
    // Fixed line heights make the document height predictable without scripts.
    const height = computed(() => PADDING * 2 + rows.value.reduce((total, row, index) => total + META + GAP + row.height + (index ? ROW_GAP : 0), 0));
    const documentHtml = computed(() => {
      const links = [...new Set(props.fonts.map(font => font.href))].map(href => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join('');
      const css = ':root{color-scheme:light}html,body{margin:0;background:#ffffff;overflow:hidden}'
        + `body{padding:${PADDING}px ${PADDING + 4}px;color:#202020;font-family:${cssValue(props.family || 'sans-serif')}}`
        + `.row+.row{margin-top:${ROW_GAP}px}`
        + `.meta{height:${META}px;margin-bottom:${GAP}px;font:11px/${META}px ui-monospace,SFMono-Regular,Menlo,monospace;color:#6b6b76;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`
        + '.meta b{color:#202020;font-weight:600}'
        + '.text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
      const body = rows.value.map(row => {
        const style = `font-size:${cssValue(row.fontSize)};line-height:${row.height}px;font-weight:${cssValue(row.fontWeight)};letter-spacing:${cssValue(row.letterSpacing)};font-style:${cssValue(row.fontStyle)}`;
        const meta = [row.fontSize + ' / ' + row.lineHeight, row.fontWeight, row.letterSpacing !== 'normal' ? row.letterSpacing : '', row.fontStyle !== 'normal' ? row.fontStyle : ''].filter(Boolean).join(' · ');
        return `<div class="row"><div class="meta"><b>${escapeHtml(row.label ?? 'text-' + row.name)}</b> · ${escapeHtml(meta)}</div>`
          + `<div class="text" style="${escapeHtml(style)}">${escapeHtml(props.sample)}</div></div>`;
      }).join('');
      return `<!doctype html><html><head><meta charset="utf-8">${links}<style>${css}</style></head><body>${body}</body></html>`;
    });
    return { height, documentHtml };
  }
});
</script>
