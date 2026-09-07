import colors from '@zx_style/tokens/colors.json';
import typography from '@zx_style/tokens/typography.json';
import radius from '@zx_style/tokens/radius.json';
import shadows from '@zx_style/tokens/shadows.json';
import blur from '@zx_style/tokens/blur.json';
import borders from '@zx_style/tokens/borders.json';
import { tokenToCssVarsObject } from '@zx_.zaux/extensions/tailwind/plugins/cssvars.js';

function group(id, values, prefix, type = 'text') {
  return {
    id, label: 'zx_builder_tokens_' + id,
    variables: Object.entries(tokenToCssVarsObject(values, prefix, '-', { colorsAsRgb: type === 'color' }))
      .map(([name, value]) => ({ name, value, type }))
  };
}
export const tokenGroups = [
  group('components', colors.set1, '--zx-color-set1', 'color'),
  group('editor', colors.zaux, '--zx-color-zaux', 'color'),
  group('utility', colors.utility, '--zx-color-utility', 'color'),
  group('fonts', typography.fontFamily, '--zx-font'),
  group('radius', radius, '--zx-radius'),
  group('shadows', shadows, '--zx-shadow'),
  group('blur', blur, '--zx-blur'),
  group('borders', borders.widths, '--zx-border')
];
export const uiControls = [
  ['global.roundness', 'zx_builder_ui_roundness'],
  ['buttons.rounded', 'zx_builder_ui_buttons_rounded'],
  ['buttons.pilled', 'zx_builder_ui_buttons_pilled'],
  ['inputs.general.rounded', 'zx_builder_ui_inputs_rounded'],
  ['inputs.general.pilled', 'zx_builder_ui_inputs_pilled'],
  ['inputs.radioSelect.rounded', 'zx_builder_ui_radio_rounded'],
  ['inputs.radioSelect.pilled', 'zx_builder_ui_radio_pilled'],
  ['cards.general.rounded', 'zx_builder_ui_cards_rounded'],
  ['toast.pilled', 'zx_builder_ui_toast_pilled']
];
export function colorHex(value) {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const channels = String(value).trim().split(/\s+/).map(Number);
  return channels.length === 3 && channels.every(value => Number.isFinite(value) && value >= 0 && value <= 255)
    ? '#' + channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('') : '#000000';
}
export function colorValue(value) {
  if (/^#[\da-f]{3}$/i.test(value)) value = '#' + value.slice(1).split('').map(char => char + char).join('');
  return /^#[\da-f]{6}$/i.test(value) ? value.slice(1).match(/../g).map(part => parseInt(part, 16)).join(' ') : value;
}
