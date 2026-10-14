import { extendTailwindMerge } from 'tailwind-merge';
import borders from '../../vendor/zaux/style/tokens/borders.json';
import typography from '../../vendor/zaux/style/tokens/typography.json';
import shadows from '../../vendor/zaux/style/tokens/shadows.json';
import blur from '../../vendor/zaux/style/tokens/blur.json';
import ratios from '../../vendor/zaux/style/tokens/ratios.json';

// Named Zaux widths and typography must not fall through to color groups;
// token ratios (aspect-16-9) must replace each other.
export const mergeClasses = extendTailwindMerge({
  extend: {
    theme: { borderWidth: Object.keys(borders.widths), blur: Object.keys(blur) },
    classGroups: {
      'font-size': [{ text: Object.keys(typography.styles) }],
      shadow: [{ shadow: Object.keys(shadows) }],
      aspect: [{ aspect: Object.keys(ratios) }]
    }
  }
});
