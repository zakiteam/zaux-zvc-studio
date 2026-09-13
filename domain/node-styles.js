import { mergeClasses } from '../integrations/zaux/merge-classes.js';

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

// Expand physical radius shorthands without touching logical corners.
function radiusParts(utility) {
  // Zaux uses s/l as whole-radius token names, not side shorthands.
  if (/^rounded-(?:s|l)$/.test(utility)) {
    return ['tl', 'tr', 'bl', 'br'].map(side => `rounded-${side}-${utility.slice(8)}`);
  }
  if (/^rounded-(?:s|e|ss|se|es|ee)(?:-|$)/.test(utility)) return [];
  const match = utility.match(/^rounded(?:-(tl|tr|br|bl|t|r|b|l))?(?:-(.+))?$/);
  if (!match) return [];
  const corners = { t: ['tl', 'tr'], r: ['tr', 'br'], b: ['bl', 'br'], l: ['tl', 'bl'] };
  const sides = match[1] ? (corners[match[1]] ?? [match[1]]) : ['tl', 'tr', 'bl', 'br'];
  return sides.map(side => `rounded-${side}${match[2] ? '-' + match[2] : ''}`);
}


function borderParts(utility, control) {
  if (control.borderStyle) {
    if (/^\[border-(?:top|right|bottom|left)-style:.+\]$/.test(utility)) return [utility];
    if (!control.baseOptions.some(option => option.value === utility)) return [];
    return ['top', 'right', 'bottom', 'left'].map(side => `[border-${side}-style:${utility.slice(7)}]`);
  }
  if (/^border-(?:s|e)(?:-|$)/.test(utility)) return [];
  const match = utility.match(/^border(?:-([trblxy]))?(?:-(.+))?$/);
  if (!match) return [];
  const base = match[2] ? 'border-' + match[2] : 'border';
  if (/^border-(?:solid|dashed|dotted|double|hidden)$/.test(base)) return [];
  if (!matches(base, { options: control.baseOptions, matchValues: control.baseMatchValues, opacity: control.opacity })) return [];
  const sides = { x: ['r', 'l'], y: ['t', 'b'] };
  return (match[1] ? sides[match[1]] ?? [match[1]] : ['t', 'r', 'b', 'l'])
    .map(side => `border-${side}${match[2] ? '-' + match[2] : ''}`);
}

function globalEdgeValue(value) {
  return value.replace(/^(!?-?)([pm])[trbl]-/, '$1$2-').replace(/rounded-(?:tl|tr|bl|br)(?=-|$)/, 'rounded')
    .replace(/border-[trbl](?=-|$)/, 'border')
    .replace(/\[border-(?:top|right|bottom|left)-style:(.+)\]/, 'border-$1');
}

function spacingParts(utility) {
  const match = utility.match(/^(-?)(p|m)([trblxy]?)-(.+)$/);
  if (match) {
    const [, negative, kind, axis, value] = match;
    const sides = { '': 'trbl', x: 'rl', y: 'tb', t: 't', r: 'r', b: 'b', l: 'l' }[axis];
    return [...sides].map(side => `${negative}${kind}${side}-${value}`);
  }
  const inset = utility.match(/^(-?)inset(?:-([xy]))?-(.+)$/);
  if (inset) {
    const [, negative, axis, value] = inset;
    const sides = axis === 'x' ? ['left', 'right'] : axis === 'y' ? ['top', 'bottom'] : ['top', 'right', 'bottom', 'left'];
    return sides.map(side => `${negative}${side}-${value}`);
  }
  const size = utility.match(/^size-(.+)$/);
  if (size) return [`w-${size[1]}`, `h-${size[1]}`];
  const gap = utility.match(/^gap-(?![xy]-)(.+)$/);
  return gap ? [`gap-x-${gap[1]}`, `gap-y-${gap[1]}`] : [utility];
}

function matches(utility, control) {
  if (control.pattern?.test(utility)) return true;
  const values = control.matchValues ?? control.options?.map(option => option.value) ?? [];
  return values.some(value => value === utility || (control.opacity && utility.startsWith(`${value}/`)) || conflictsWith(utility, value));
}

function conflictsWith(utility, next) {
  if (!next) return false;
  const currentUtility = utility.replace(/^!/, '');
  const nextUtility = next.replace(/^!/, '');
  return mergeClasses(`${currentUtility} ${nextUtility}`) === nextUtility;
}

function candidates(value, control, scope) {
  return (literalClasses(value) ?? []).flatMap(token => {
    const parsed = splitClass(token);
    if (parsed.scope !== scope) return [];
    const parts = control.border ? borderParts(parsed.utility, control) : control.radius ? radiusParts(parsed.utility) : control.spacing ? spacingParts(parsed.utility) : [parsed.utility];
    return parts.filter(part => matches(part, control)).map(utility => ({ ...parsed, utility, specificity: parts.length }));
  });
}

export function readStyleClass(value, control, scope = '') {
  if (control.globalSides) {
    const values = control.globalSides.map(side => globalEdgeValue(readStyleClass(value, side, scope)));
    return values.every(item => item === values[0]) ? values[0] : '__mixed__';
  }
  const found = candidates(value, control, scope);
  // Tailwind's side utilities override axis/all-side utilities; important wins first.
  found.sort((a, b) => Number(a.important) - Number(b.important) || b.specificity - a.specificity);
  const current = found.at(-1);
  return current ? `${current.important ? '!' : ''}${current.utility}` : '';
}

// A global control is important only when all of its authored sides are important.
export function readStyleImportant(value, control, scope = '') {
  const controls = control.globalSides ?? [control];
  const values = controls.map(side => readStyleClass(value, side, scope)).filter(Boolean);
  return values.length > 0 && values.every(item => item.startsWith('!'));
}

export function setStyleImportant(value, control, important, scope = '') {
  if (literalClasses(value) === null) return value;
  if (control.globalSides) {
    return control.globalSides.reduce((result, side) => setStyleImportant(result, side, important, scope), value);
  }
  const current = readStyleClass(value, control, scope);
  if (!current || current.startsWith('!') === important) return value;
  // Reuse the existing family removal to preserve other sides and variant scopes.
  const remaining = literalClasses(replaceStyleClass(value, control, '', scope));
  return [...remaining, scope + (important ? '!' : '') + current.replace(/^!/, '')].join(' ');
}

// Numbers without units use pixels. Percentages do not apply to the Z axis.
export function positionValueClass(control, value) {
  const input = String(value).trim();
  if (!input) return '';
  if (control.objectPosition) {
    const parts = input.split(/\s+/);
    if (parts.length !== 2) return null;
    const values = parts.map(part => positionValueClass({ prefix: 'object' }, part));
    if (values.some(value => value === null)) return null;
    return `object-[${values.map(value => readPositionValue(value, { prefix: 'object' })).join('_')}]`;
  }
  if (control.integer) return /^[+-]?\d+$/.test(input) ? `${control.prefix}-[${input}]` : null;
  const match = input.match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(px|rem|em|vh|vw|vmin|vmax|svh|lvh|dvh|ch|ex|cm|mm|in|pt|pc|%)?$/);
  if (!match || (control.depth && match[1] === '%') || (control.nonNegative && Number.parseFloat(input) < 0)) return null;
  const length = match[1] ? input : `${input}px`;
  return control.depth ? `[translate:0_0_${length}]` : `${control.prefix}-[${length}]`;
}

export function readPositionValue(value, control) {
  const match = control.depth
    ? value.match(/^!?\[translate:0_0_(.+)\]$/)
    : value.match(new RegExp(`^!?${control.prefix}-\\[(.+)\\]$`));
  return control.objectPosition ? (match?.[1] ?? '').replace(/_/g, ' ') : match?.[1] ?? '';
}

export function replaceStyleClass(value, control, next, scope = '') {
  const tokens = literalClasses(value);
  if (tokens === null) return value;
  if (next && !control.options.some(option => option.value === next)
    && !((control.length || control.integer) && positionValueClass(control, readPositionValue(next, control)) === next)) return value;
  if (next && readStyleImportant(value, control, scope)) next = '!' + next;
  if (control.globalSides) {
    let result = value;
    for (const side of control.globalSides) result = replaceStyleClass(result, side, '', scope);
    return [...literalClasses(result), ...(next ? [scope + next] : [])].join(' ');
  }
  if (control.border) {
    const output = tokens.filter(token => {
      const parsed = splitClass(token);
      return parsed.scope !== scope || borderParts(parsed.utility, control).length === 0;
    });
    const sides = control.borderStyle ? ['top', 'right', 'bottom', 'left'] : ['t', 'r', 'b', 'l'];
    for (const side of sides) {
      const pattern = control.borderStyle
        ? new RegExp(`^\\[border-${side}-style:.+\\]$`)
        : new RegExp(`^border-${side}(?:-.+)?$`);
      const current = readStyleClass(value, { ...control, pattern, options: [], matchValues: [] }, scope);
      if (current && !matches(current.replace(/^!/, ''), control)) output.push(scope + current);
    }
    if (next) output.push(scope + next);
    return output.join(' ');
  }
  if (control.radius) {
    const output = tokens.filter(token => {
      const parsed = splitClass(token);
      return parsed.scope !== scope || radiusParts(parsed.utility).length === 0;
    });
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const side = { radius: true, pattern: new RegExp(`^rounded-${corner}(?:-.+)?$`) };
      const current = readStyleClass(value, side, scope);
      if (current && !matches(current.replace(/^!/, ''), control)) output.push(scope + current);
    }
    if (next) output.push(scope + next);
    return output.join(' ');
  }
  if (control.spacing) {
    const family = control.family;
    const prefixes = family === 'size' ? ['w', 'h'] : family === 'gap' ? ['gap-x', 'gap-y'] : family === 'inset' ? ['top', 'right', 'bottom', 'left'] : [...'trbl'].map(side => family + side);
    const familyPattern = family === 'size' ? /^(?:size|w|h)-.+$/ : family === 'gap' ? /^gap-(?:[xy]-)?.+$/ : family === 'inset' ? /^-?(?:inset(?:-[xy])?|top|right|bottom|left)-.+$/ : new RegExp(`^-?${family}[trblxy]?-.+$`);
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
    return parsed.scope !== scope || (!matches(parsed.utility, control) && !conflictsWith(parsed.utility, next));
  });
  if (next) output.push(scope + next);
  if (next && control.id === 'container') {
    // Center the container without losing vertical margins or other breakpoints.
    return replaceStyleClass(output.join(' '), {
      spacing: true,
      family: 'm',
      pattern: /^-?m[rl]-.+$/,
      options: [{ value: 'mx-auto' }]
    }, 'mx-auto', scope);
  }
  return output.join(' ');
}

// Scope changes preserve unrelated classes and JSON bindings.
export function hasStyleScope(value, scope) {
  return (literalClasses(value) ?? []).some(token => {
    const parsed = splitClass(token);
    return scope ? parsed.scope.startsWith(scope) : parsed.scope === '';
  });
}

export function removeStyleScope(value, scope) {
  const tokens = literalClasses(value);
  if (tokens === null) return value;
  const remaining = tokens.filter(token => !hasStyleScope(token, scope));
  return Array.isArray(value) ? remaining : remaining.join(' ');
}

export function transferBaseStyles(value, scope, controls) {
  const tokens = literalClasses(value);
  if (tokens === null) return value;
  const result = tokens.map(token => {
    if (splitClass(token).scope) return token;
    return controls.some(control => candidates(token, control, '').length)
      ? scope + token : token;
  });
  return Array.isArray(value) ? result : result.join(' ');
}
