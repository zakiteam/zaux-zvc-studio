// Stands in for Zaux's `_local/tailwind` safelist. Classes declared in Zaux SCSS
// @layer blocks are listed by scripts/zaux/prepare.mjs as plain names, so they are
// always emitted even when no scanned file uses them.
import layerClasses from './generated/layer-classes.json';

export default { safelist: layerClasses };
