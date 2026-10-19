import { isBinding, spreadKey, withoutSpread } from '../nodes.js';

// JSON -> PHP literal printer. Values stay literal (false, 0, '' and null are
// preserved); only explicit $bind / $spread markers become helper calls that
// read `$data`, mirroring `resolveValue` in domain/nodes.js. No input is
// evaluated: user strings are always emitted as single-quoted PHP strings.

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

// `context`: { profile, data = '$data', bindings = true }.
export function phpValue(value, context, depth = 0) {
  const { profile } = context;
  const data = context.data ?? '$data';
  const pad = level => profile.indent.repeat(level);
  if (context.bindings !== false && isBinding(value)) return `${profile.helpers.getValue}(${data}, ${phpString(value.$bind)})`;
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string') return phpString(value);
  const spread = context.bindings !== false ? spreadKey(value) : null;
  if (spread !== null) {
    const base = phpValue(withoutSpread(value), context, depth);
    return `${profile.helpers.spread}(${data}, ${phpString(spread)}, ${base})`;
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
