import UIConfig from '@zx_style/ui.config';
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
      sheet.textContent = presetCss(preset);
      useUISettingsStore().loadUISettings(mergeUISettings(UIConfig, preset.uiSettings));
    },
    dispose() { sheet?.remove(); }
  };
}
