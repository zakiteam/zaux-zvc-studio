import { clone } from '../../../domain/nodes.js';
import { createThemePreviewPresets } from './theme-preview-presets.js';

// A stylesheet fragment can theme a differently named component.
const aliases = { Input: 'InputText', InputShared: 'InputText', richtext: 'RichText', Slider: 'SliderSingle' };
const fixedProps = new Set(['theme', 'size', 'name', 'tag', 'autoTrigger', 'isAppToast', 'modalId', 'outputMode']);

export function themePreviewConfig(entry, translate) {
  const preset = createThemePreviewPresets(translate)[entry.id];
  if (!preset) return null;
  const name = aliases[entry.id] ?? entry.id;
  const node = clone({ id: 'theme-component', name, props: preset.props, children: preset.children ?? [] });
  const fields = Object.entries(node.props).filter(([key]) => !fixedProps.has(key) && !(['ZButton', 'Tag', 'InputRadio'].includes(name) && key === 'type')).map(([key, value]) => {
    const options = preset.selects?.[key];
    const type = options ? 'select' : typeof value === 'boolean' ? 'switch' : typeof value === 'number' ? 'number'
      : value === null || typeof value === 'object' ? 'json' : /^(contentHTML|content|text|excerpt|subtitle)$/.test(key) ? 'textarea' : 'text';
    return { key, type, options: options?.map(value => ({ value, label: value })) };
  });
  return { node, fields, sizes: preset.sizes ?? ['s', 'm', 'l'], themeClass: preset.themeClass };
}

export function themePreviewNode(entry, translate) {
  return themePreviewConfig(entry, translate)?.node ?? null;
}
