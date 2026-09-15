// Component variables may contain RGB channels or a complete CSS color.
export function colorCssValue(value = '') {
  return String(value).replace(/\s*!important\s*$/i, '').trim();
}

export function isThemeColorVariable(name, value = '') {
  return /-(?:color|bg|background|fill|stroke)(?:-(?:hover|focus|active|disabled))?$/.test(name)
    || /^var\(--zx-color-[\w-]+\)$/.test(colorCssValue(value));
}

export function themeColorTokenValue(name, sourceValue, currentValue = '') {
  const reference = `var(${name})`;
  const fullColor = /^(?:#|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\()/i.test(colorCssValue(sourceValue || currentValue));
  const value = fullColor ? `rgb(${reference})` : reference;
  return value + (/!important\s*$/i.test(currentValue) ? ' !important' : '');
}
