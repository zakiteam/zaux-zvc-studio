// Server-only adapter. The catalog API is internal to the pinned Tailwind 3.4.17.
// Keep this dependency here so a Tailwind upgrade does not affect input controls.
import resolveConfig from 'tailwindcss/resolveConfig.js';
import setupContext from 'tailwindcss/lib/lib/setupContextUtils.js';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from './tailwind.config.js';
import { remValuesToPixels } from '../../domain/tailwind-assistance.js';

let catalog;
const previews = new Map();
const compilerConfig = { ...config, content: [], safelist: [], corePlugins: { ...config.corePlugins, preflight: false } };

export function tailwindCatalog() {
  if (!catalog) {
    const context = setupContext.createContext(resolveConfig(compilerConfig));
    const classes = context.getClassList({ includeMetadata: true });
    const variants = context.getVariants().flatMap(variant => [
      ...(!variant.isArbitrary ? [variant.name] : []),
      ...variant.values.map(value => value === 'DEFAULT' ? variant.name : `${variant.name}${variant.hasDash ? '-' : ''}${value}`),
    ]);
    catalog = { classes, variants: [...new Set(variants)], separator: context.tailwindConfig.separator };
  }
  return catalog;
}

export async function tailwindClassCss(className) {
  if (previews.has(className)) return previews.get(className);
  // Safelist the exact candidate: no HTML parsing or interpretation of quotes.
  const result = await postcss([tailwindcss({ ...compilerConfig, safelist: [className] })])
    .process('@tailwind utilities;', { from: undefined });
  // Only the assistance response is formatted; selectors and authored CSS stay literal.
  const display = result.root.clone();
  display.walkDecls(declaration => { declaration.value = remValuesToPixels(declaration.value); });
  const css = display.toString();
  if (previews.size >= 100) previews.delete(previews.keys().next().value);
  previews.set(className, css);
  return css;
}
