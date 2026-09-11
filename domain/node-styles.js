// Only literal class lists are editable: bindings and conditional maps stay intact.
export function literalClasses(value) {
  if (value == null) return [];
  if (typeof value === 'string') return value.trim().split(/\s+/).filter(Boolean);
  if (Array.isArray(value)) {
    const lists = value.map(literalClasses);
    return lists.some(list => list === null) ? null : lists.flat();
  }
  return null;
}

export function splitClass(value) {
  let depth = 0;
  let separator = -1;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '[' || value[index] === '(') depth++;
    if (value[index] === ']' || value[index] === ')') depth--;
    if (value[index] === ':' && depth === 0) separator = index;
  }
  const utility = value.slice(separator + 1);
  return { scope: value.slice(0, separator + 1), utility: utility.replace(/^!/, ''), important: utility.startsWith('!') };
}

function spacingParts(utility) {
  const match = utility.match(/^(-?)(p|m)([trblxy]?)-(.+)$/);
  if (match) {
    const [, negative, kind, axis, value] = match;
    const sides = { '': 'trbl', x: 'rl', y: 'tb', t: 't', r: 'r', b: 'b', l: 'l' }[axis];
    return [...sides].map(side => `${negative}${kind}${side}-${value}`);
  }
  const gap = utility.match(/^gap-(?![xy]-)(.+)$/);
  return gap ? [`gap-x-${gap[1]}`, `gap-y-${gap[1]}`] : [utility];
}

function matches(utility, control) {
  if (control.pattern) return control.pattern.test(utility);
  const values = control.matchValues ?? control.options.map(option => option.value);
  return values.some(value => value === utility || (control.opacity && utility.startsWith(`${value}/`)));
}

function candidates(value, control, scope) {
  return (literalClasses(value) ?? []).flatMap(token => {
    const parsed = splitClass(token);
    if (parsed.scope !== scope) return [];
    const parts = control.spacing ? spacingParts(parsed.utility) : [parsed.utility];
    return parts.filter(part => matches(part, control)).map(utility => ({ ...parsed, utility, specificity: parts.length }));
  });
}

export function readStyleClass(value, control, scope = '') {
  const found = candidates(value, control, scope);
  // Tailwind's side utilities override axis/all-side utilities; important wins first.
  found.sort((a, b) => Number(a.important) - Number(b.important) || b.specificity - a.specificity);
  const current = found.at(-1);
  return current ? `${current.important ? '!' : ''}${current.utility}` : '';
}

export function replaceStyleClass(value, control, next, scope = '') {
  const tokens = literalClasses(value);
  if (tokens === null) return value;
  if (next && !control.options.some(option => option.value === next)) return value;
  if (control.spacing) {
    const family = control.family;
    const prefixes = family === 'gap' ? ['gap-x', 'gap-y'] : [...'trbl'].map(side => family + side);
    const familyPattern = family === 'gap' ? /^gap-(?:[xy]-)?.+$/ : new RegExp(`^-?${family}[trblxy]?-.+$`);
    const output = tokens.filter(token => {
      const parsed = splitClass(token);
      return parsed.scope !== scope || !familyPattern.test(parsed.utility);
    });
    // Resolve shorthand before splitting it so an existing side override is retained.
    for (const prefix of prefixes) {
      const side = { spacing: true, pattern: new RegExp(`^-?${prefix}-.+$`) };
      const current = readStyleClass(value, side, scope);
      if (current && !matches(current.replace(/^!/, ''), control)) output.push(scope + current);
    }
    if (next) output.push(scope + next);
    return output.join(' ');
  }
  const output = tokens.filter(token => {
    const parsed = splitClass(token);
    return parsed.scope !== scope || !matches(parsed.utility, control);
  });
  if (next) output.push(scope + next);
  return output.join(' ');
}
