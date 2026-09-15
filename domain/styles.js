import { clone } from './nodes.js';
import { projectFonts } from './fonts.js';

export function createStylePreset() { return { cssVars: [], uiSettings: {} }; }
export function validateStylePreset(preset) {
  if (preset?.bodyBackground !== undefined && (typeof preset.bodyBackground !== 'string' || !/^(?:|transparent|rgb\(var\(--zx-color-[\w-]+\)\)|#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8})$/i.test(preset.bodyBackground))) throw new Error('zx_builder_invalid_style_preset');
  if (preset?.fonts !== undefined) projectFonts(preset.fonts);
  if (!preset || !Array.isArray(preset.cssVars) || preset.cssVars.length > 100) throw new Error('zx_builder_invalid_style_preset');
  const selectors = new Set();
  for (const group of preset.cssVars) {
    if (typeof group.selector !== 'string' || !group.selector.trim() || /[{}<>;]/.test(group.selector) || selectors.has(group.selector) || !Array.isArray(group.vars) || group.vars.length > 1000) throw new Error('zx_builder_invalid_style_preset');
    selectors.add(group.selector);
    const names = new Set();
    for (const variable of group.vars) {
      if (!/^--zx-[\w-]+$/.test(variable.name) || names.has(variable.name) || typeof variable.value !== 'string' || /[;{}<>]/.test(variable.value)) throw new Error('zx_builder_invalid_style_preset');
      names.add(variable.name);
    }
  }
  if (preset.uiSettings !== undefined && (!preset.uiSettings || typeof preset.uiSettings !== 'object' || Array.isArray(preset.uiSettings))) throw new Error('zx_builder_invalid_style_preset');
  return preset;
}
export function setStyleVariable(preset, name, value, type = 'text') {
  let group = preset.cssVars.find(group => group.selector === ':root');
  if (!group && value !== undefined) { group = { selector: ':root', vars: [] }; preset.cssVars.push(group); }
  if (!group) return;
  const index = group.vars.findIndex(variable => variable.name === name);
  if (value === undefined) { if (index >= 0) group.vars.splice(index, 1); }
  else {
    const variable = { name, value: String(value), type };
    if (index < 0) group.vars.push(variable); else group.vars[index] = variable;
  }
  if (!group.vars.length) preset.cssVars.splice(preset.cssVars.indexOf(group), 1);
}
export function presetCss(preset, { includeBody = true } = {}) {
  validateStylePreset(preset);
  const variables = preset.cssVars.map(group => group.selector + ' {\n' + group.vars.map(variable => '  ' + variable.name + ': ' + variable.value + ';').join('\n') + '\n}').join('\n\n');
  return [variables, includeBody && preset.bodyBackground ? `body { background-color: ${preset.bodyBackground}; }` : ''].filter(Boolean).join('\n\n');
}
export function mergeUISettings(defaults, overrides = {}) {
  const result = clone(defaults);
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(result, key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) result[key] = mergeUISettings(result[key], value);
    else if (typeof value === typeof result[key] || result[key] === null) result[key] = clone(value);
  }
  return result;
}
export function setUIValue(preset, path, value) {
  const keys = path.split('.');
  let current = preset.uiSettings ??= {};
  for (const key of keys.slice(0, -1)) current = current[key] ??= {};
  current[keys.at(-1)] = value;
}
