import { clone } from './nodes.js';
import { componentThemesCss } from './component-themes.js';

export function libraryThumbnailState(definition, workspace, language) {
  function withoutPreview(item) {
    const copy = clone(item);
    delete copy.previewImage;
    if (copy.partials) copy.partials = copy.partials.map(withoutPreview);
    return copy;
  }
  return {
    instances: [{ id: 'thumbnail', name: definition.name, definition: withoutPreview(definition), data: {} }],
    styles: clone(workspace.styles),
    themeCss: componentThemesCss(workspace.componentThemes),
    language,
    editable: false,
    clean: true,
  };
}
