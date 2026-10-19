import { sourceModule } from '../source-runtime.js';
import { sourceTree } from '../source-zvc.js';
import { clone, dataFor, resolveValue } from '../nodes.js';

// Field bindings of native (JavaScript) ZVC/ZVPs. Their buildNode code cannot
// be translated, so the PHP export renders it once with sentinel field values
// and maps where each sentinel lands: an intact string becomes { $bind: key },
// an object field spread into props becomes { $spread: key, ...props }. The
// result is kept only if, resolved with the real data, it equals the real
// render exactly; fields that fail (transformed, concatenated, used in
// conditions) stay literal, as in a snapshot.

const OBJECT_MARK = '\u0000zaux-bind';
const stringMark = key => `\u0000zaux-bind:${key}\u0000`;
const isPlainObject = value => value && typeof value === 'object' && !Array.isArray(value);

// Only values whose sentinel keeps the same truthiness and shape are candidates.
function eligible(value) {
  if (typeof value === 'string') return value !== '';
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function render(module, definition, data) {
  return sourceTree(module.buildNode(data, {}), definition.id)
    .map(function compact(node) {
      return { name: node.name, props: node.props ?? {}, ...(node.children?.length ? { children: node.children.map(compact) } : {}) };
    });
}

// Replaces sentinels with markers; returns null when a sentinel was altered.
function mark(value, keys) {
  let valid = true;
  function walk(item) {
    if (typeof item === 'string') {
      const key = keys.find(candidate => item === stringMark(candidate));
      if (key) return { $bind: key };
      if (item.includes('\u0000zaux-bind')) valid = false;
      return item;
    }
    if (Array.isArray(item)) return item.map(walk);
    if (!isPlainObject(item)) return item;
    if (Object.hasOwn(item, OBJECT_MARK)) {
      const key = item[OBJECT_MARK];
      const rest = Object.fromEntries(Object.entries(item).filter(([name]) => name !== OBJECT_MARK).map(([name, child]) => [name, walk(child)]));
      return Object.keys(rest).length ? { $spread: key, ...rest } : { $bind: key };
    }
    return Object.fromEntries(Object.entries(item).map(([name, child]) => [name, walk(child)]));
  }
  const result = walk(value);
  return valid ? result : null;
}

function attempt(module, definition, values, keys, expected) {
  try {
    const data = clone(values);
    for (const key of keys) data[key] = typeof values[key] === 'string' ? stringMark(key) : { [OBJECT_MARK]: key };
    const marked = mark(render(module, definition, data), keys);
    if (!marked) return null;
    return JSON.stringify(resolveValue(marked, values)) === expected ? marked : null;
  } catch {
    return null;
  }
}

// Compact nodes with $bind/$spread markers for a native definition, or null
// when its module is unavailable. `data` is the instance configuration.
export function nativeBoundNodes(definition, data = {}) {
  const module = definition.sourceKey ? sourceModule(definition.sourceKey) : null;
  if (!module) return null;
  const values = dataFor(definition, data);
  let real;
  try {
    real = render(module, definition, clone(values));
  } catch {
    return null;
  }
  const expected = JSON.stringify(real);
  const candidates = (definition.fields ?? []).map(field => field.key).filter(key => eligible(values[key]));
  // All candidates at once; otherwise keep the ones that verify, one by one.
  const all = candidates.length ? attempt(module, definition, values, candidates, expected) : null;
  if (all) return all;
  let accepted = [];
  let best = real;
  for (const key of candidates) {
    const result = attempt(module, definition, values, [...accepted, key], expected);
    if (result) { accepted = [...accepted, key]; best = result; }
  }
  return best;
}
