import buttonMeta from '@zx_core/components/shared/button/ZButton.meta.js';

// Options of every PHP export (domain/php). The profile receives the Zaux data
// it needs from the pinned release (ZButton themes for the ACF CTA selects), so
// domain/php stays free of Zaux imports.
const profile = { acf: { buttonThemes: [...(buttonMeta.themes ?? [])] } };

export function phpExportOptions({ readme = false, acf = true, ...rest } = {}) {
  return { ...rest, readme: readme === true, acf: acf !== false, profile };
}
