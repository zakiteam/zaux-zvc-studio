import { extendTailwindMerge } from 'tailwind-merge';
import borders from '../../vendor/zaux/style/tokens/borders.json';
import typography from '../../vendor/zaux/style/tokens/typography.json';

// Named Zaux widths and typography must not fall through to color groups.
export const mergeClasses = extendTailwindMerge({
  extend: {
    theme: { borderWidth: Object.keys(borders.widths) },
    classGroups: { 'font-size': [{ text: Object.keys(typography.styles) }] }
  }
});
