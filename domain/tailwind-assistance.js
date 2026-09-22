// Class strings remain literal; only the token around a collapsed caret is edited.
// Display-only conversion at the conventional 16px root size. Preserve CSS text,
// URLs and identifiers (including custom property names) containing "rem".
export function remValuesToPixels(value) {
  return value.replace(
    /\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|url\((?:\\[\s\S]|[^)\\])*\)|(?:--|-?[_a-z])(?:[\w-]|\\[\s\S])*|\\[\s\S]|([+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?)rem\b/gi,
    (token, amount) => amount === undefined ? token : `${Number((Number(amount) * 16).toFixed(6))}px`,
  );
}

export function classToken(value, caret, selectionEnd = caret) {
  if (caret !== selectionEnd) return null;
  let from = caret;
  let to = caret;
  while (from > 0 && !/\s/.test(value[from - 1])) from--;
  while (to < value.length && !/\s/.test(value[to])) to++;
  return { from, to, value: value.slice(from, to) };
}

function variantBoundary(value, separator) {
  let depth = 0;
  let boundary = 0;
  let quote = '';
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '\\') { i++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '(') depth++;
    if (char === ']' || char === ')') depth--;
    if (!depth && value.startsWith(separator, i)) boundary = i + separator.length;
  }
  return boundary;
}

export function classSuggestions(value, catalog, limit = 30) {
  if (!catalog || value.length > 512) return [];
  const separator = catalog.separator || ':';
  const boundary = variantBoundary(value, separator);
  const prefix = value.slice(0, boundary);
  const utility = value.slice(boundary);
  const important = utility.startsWith('!') ? '!' : '';
  const query = utility.slice(important.length);
  const matches = [];
  for (const entry of catalog.classes) {
    const [name, metadata] = Array.isArray(entry) ? entry : [entry, null];
    if (name.startsWith(query)) matches.push(prefix + important + name);
    if (query.startsWith(name + '/')) {
      for (const modifier of metadata?.modifiers ?? []) {
        const candidate = `${name}/${modifier}`;
        if (candidate.startsWith(query)) matches.push(prefix + important + candidate);
      }
    }
  }
  if (!important) {
    for (const variant of catalog.variants) {
      if (variant.startsWith(query)) matches.push(prefix + variant + separator);
    }
  }
  return [...new Set(matches)].sort((a, b) => (a === value ? -1 : b === value ? 1 : a.localeCompare(b))).slice(0, limit);
}

export function completeClass(value, token, candidate, separator = ':') {
  const suffix = value.slice(token.to);
  const space = candidate.endsWith(separator) || /^\s/.test(suffix) ? '' : ' ';
  return { value: value.slice(0, token.from) + candidate + space + suffix, caret: token.from + candidate.length + space.length };
}
