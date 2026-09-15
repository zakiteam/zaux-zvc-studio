import { starterFiles, nativeStarterFiles } from '../../domain/starter-export.js';
import { tokenGroups, tokenDocuments } from '../data/styles/tokens.js';
import { defaultUISettings } from './styles.js';
import { filesForDefinition } from './source-zvc.js';

export function projectStarterFiles(workspace, templateId) {
  return starterFiles(workspace, {
    tokenGroups, tokenDocuments, defaultUISettings, templateId,
    filesForComponent(definition) {
      const files = filesForDefinition(definition);
      return definition.sourceKey ? nativeStarterFiles(definition, files) : files;
    }
  });
}
