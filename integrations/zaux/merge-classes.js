import { extendTailwindMerge } from 'tailwind-merge';
import borders from '../../vendor/zaux/style/tokens/borders.json';

// Named Zaux widths must not fall through to Tailwind's border-color group.
export const mergeClasses = extendTailwindMerge({
  extend: {
    theme: { borderWidth: Object.keys(borders.widths) }
  }
});
