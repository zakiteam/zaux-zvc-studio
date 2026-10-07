// Stands in for Zaux's `_local/tailwind` safelist. Classes declared in Zaux SCSS
// @layer blocks are listed by scripts/zaux/prepare.mjs: plain names, so a CSS entry
// without those layers (editor.css) does not warn about unmatched patterns.
import layerClasses from './generated/layer-classes.json';

export default { safelist: layerClasses };
