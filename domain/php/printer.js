import { isBinding, spreadKey, withoutSpread } from '../nodes.js';

// JSON -> PHP literal printer. Values stay literal (false, 0, '' and null are
// preserved); only explicit $bind / $spread markers become reads of `$data`
// through the expressions of the profile (`$gv('key')` in zaux-wp-core),
// mirroring `resolveValue` in domain/nodes.js. No input is evaluated: user
// strings are always emitted as quoted PHP strings.

// Expressions created by the emitter, never by persisted data: a function
// call (partial ZVP calls, `__()` labels) or a fixed piece of code (`$params`).
export class PhpCall {
  constructor(fn, args = []) { this.fn = fn; this.args = args; }
}
export class PhpCode {
  constructor(code) { this.code = code; }
}

// Strings with control characters use escaped double quotes, so generated
// sources never contain raw line breaks inside literals (emitters re-indent
// code line by line). `$` is escaped to prevent interpolation.
const CONTROL_RE = /[\x00-\x1f\x7f]/;
const ESCAPES = { '\n': '\\n', '\r': '\\r', '\t': '\\t', '\v': '\\v', '\f': '\\f', '\x1b': '\\e' };
export function phpString(value) {
  const text = String(value);
  if (!CONTROL_RE.test(text)) return "'" + text.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  return '"' + text.replace(/[\\"$]/g, char => '\\' + char)
    .replace(/[\x00-\x1f\x7f]/g, char => ESCAPES[char] ?? '\\x' + char.charCodeAt(0).toString(16).padStart(2, '0')) + '"';
}

// `context`: { profile, bindings = true }. With bindings false (data files)
// markers stay literal arrays.
export function phpValue(value, context, depth = 0) {
  const { profile } = context;
  const pad = level => profile.indent.repeat(level);
  if (value instanceof PhpCode) return value.code;
  if (value instanceof PhpCall) return `${value.fn}(${value.args.map(arg => phpValue(arg, context, depth)).join(', ')})`;
  if (context.bindings !== false && isBinding(value)) return profile.expressions.bind(phpString(value.$bind));
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string') return phpString(value);
  const spread = context.bindings !== false && !Array.isArray(value) ? spreadKey(value) : null;
  if (spread !== null) {
    const rest = withoutSpread(value);
    return profile.expressions.spread(phpString(spread), Object.keys(rest).length ? phpValue(rest, context, depth) : null);
  }
  const list = Array.isArray(value);
  const entries = list
    ? value.map(item => phpValue(item, context, depth + 1))
    : Object.entries(value).map(([key, item]) => `${phpString(key)} => ${phpValue(item, context, depth + 1)}`);
  if (!entries.length) return list ? '[]' : profile.emptyObject;
  return `[\n${entries.map(entry => pad(depth + 1) + entry).join(',\n')},\n${pad(depth)}]`;
}

// Single-line comment text from user labels: no comment terminators, no `?>`
// (which closes PHP mode even inside `//` comments), no line breaks.
export function phpDocText(value) {
  return String(value ?? '').replace(/\*\//g, '* /').replace(/\?>/g, '? >').replace(/[\x00-\x1f\x7f]+/g, ' ').trim();
}
