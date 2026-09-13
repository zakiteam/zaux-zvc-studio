import UIConfig from '@zx_style/ui.config';
import { tokenGroups } from '../data/styles/tokens.js';
import { useUISettingsStore } from '@zx_core/common/stores/settings.store';
import { mergeUISettings, presetCss } from '../../domain/styles.js';
export { UIConfig as defaultUISettings };

// The workspace owns persistence. Zaux receives the effective UI settings.
export function createStyleBridge() {
  let sheet;
  return {
    apply(preset) {
      sheet ??= Object.assign(document.createElement('style'), { id: 'zaux-studio-tokens' });
      if (!sheet.isConnected) document.head.appendChild(sheet);
      const defaults = tokenGroups.flatMap(group => group.variables).filter(variable => variable.type === 'color');
      const overrides = preset.cssVars.filter(group => group.selector === ':root').flatMap(group => group.vars);
      const swatchVariables = Object.values(Object.fromEntries(
        [...defaults, ...overrides].map(variable => [variable.name, variable])
      ));
      // Define variables directly on the sample, bypassing the inherited Studio palette.
      const swatchCss = presetCss({ cssVars: [{ selector: '.zb-project-swatch', vars: swatchVariables }] });
      sheet.textContent = presetCss(preset) + '\n' + swatchCss;
      useUISettingsStore().loadUISettings(mergeUISettings(UIConfig, preset.uiSettings));
    },
    dispose() { sheet?.remove(); }
  };
}
