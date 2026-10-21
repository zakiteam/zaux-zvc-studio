import { starterFiles, nativeStarterFiles, starterStyleAvailability } from '../../domain/starter-export.js';
import { tokenGroups, tokenDocuments } from '../data/styles/tokens.js';
import { defaultUISettings } from './styles.js';
import { componentPackage, filesForDefinition } from './source-zvc.js';
import { presetCss } from '../../domain/styles.js';
import { componentThemesCss, projectStylesCss } from '../../domain/component-themes.js';
import { fontFiles } from '../../domain/fonts.js';

export function projectStarterFiles(workspace, templateId, parts) {
  return starterFiles(workspace, {
    tokenGroups, tokenDocuments, defaultUISettings, templateId, parts,
    filesForComponent(definition) {
      const files = filesForDefinition(definition);
      return definition.sourceKey ? nativeStarterFiles(definition, files) : files;
    }
  });
}

export function projectStarterStyleAvailability(workspace) {
  return starterStyleAvailability(workspace, { tokenGroups, tokenDocuments });
}

// JavaScript package of one component (componentPackage: `<name>/` plus the ZVPs it
// imports in `_partials/<name>/`). Opt-in parts (options, all false by default):
// `partials` the _partials/ files, `styles` the component style/ files plus the project
// component themes, project styles and body background CSS, `fonts` fonts.html/fonts.json.
// Throws like filesForDefinition (e.g. zx_builder_source_missing).
export function componentPackageFiles(workspace, definition, { partials = false, styles = false, fonts = false } = {}) {
  const themeCss = styles && componentThemesCss(workspace.componentThemes);
  const projectCss = styles && projectStylesCss(workspace.projectStyles);
  const bodyCss = styles && presetCss({ cssVars: [], bodyBackground: workspace.styles?.bodyBackground });
  return {
    ...componentPackage(definition, { partials, styles }),
    ...(fonts ? fontFiles(workspace.styles?.fonts) : {}),
    ...(themeCss ? { 'component-themes.css': themeCss } : {}),
    ...(projectCss ? { 'project-styles.css': projectCss } : {}),
    ...(bodyCss ? { 'body-background.css': bodyCss } : {})
  };
}
