import { starterFiles, nativeStarterFiles, starterStyleAvailability } from '../../domain/starter-export.js';
import { tokenGroups, tokenDocuments } from '../data/styles/tokens.js';
import { defaultUISettings } from './styles.js';
import { filesForDefinition } from './source-zvc.js';
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

// JavaScript package of one component: its ZVC/ZVP files plus the project
// fonts, component themes, project styles and body background it renders with.
// Throws like filesForDefinition (e.g. zx_builder_source_missing).
export function componentPackageFiles(workspace, definition) {
  const themeCss = componentThemesCss(workspace.componentThemes);
  const projectCss = projectStylesCss(workspace.projectStyles);
  const bodyCss = presetCss({ cssVars: [], bodyBackground: workspace.styles?.bodyBackground });
  return {
    ...filesForDefinition(definition),
    ...fontFiles(workspace.styles?.fonts),
    ...(themeCss ? { 'component-themes.css': themeCss } : {}),
    ...(projectCss ? { 'project-styles.css': projectCss } : {}),
    ...(bodyCss ? { 'body-background.css': bodyCss } : {})
  };
}
