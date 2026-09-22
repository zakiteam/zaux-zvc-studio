import { extendTailwindMerge } from 'tailwind-merge';
import borders from '../../vendor/zaux/style/tokens/borders.json';
import typography from '../../vendor/zaux/style/tokens/typography.json';
import shadows from '../../vendor/zaux/style/tokens/shadows.json';
import blur from '../../vendor/zaux/style/tokens/blur.json';

// Named Zaux widths and typography must not fall through to color groups.
export const mergeClasses = extendTailwindMerge({
  extend: {
    theme: { borderWidth: Object.keys(borders.widths), blur: Object.keys(blur) },
    classGroups: {
      'font-size': [{ text: Object.keys(typography.styles) }],
      shadow: [{ shadow: Object.keys(shadows) }]
    }
  }
});
