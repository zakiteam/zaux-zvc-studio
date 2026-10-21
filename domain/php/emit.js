import { isBinding } from '../nodes.js';
import { PhpCall, PhpCode, phpDocText, phpString, phpValue } from './printer.js';

// Prepares the pieces (`p`) used by the profile templates and writes the
// files of one unit. Text layout belongs to the templates in profile.js;
// this module only computes names, paths, partial calls and PHP literals.

const isPlainObject = value => value && typeof value === 'object' && !Array.isArray(value)
  && !(value instanceof PhpCall) && !(value instanceof PhpCode);

// ZVP references (nodes named after a partial of the owner, anywhere in the
// tree or in the data) become calls of the partial function, as the JS
// resolvePartials does at runtime. `calls`: Map exportName -> function name;
// `params`: extra call arguments (`$params` inside a component function).
export function withPartialCalls(value, calls, profile, params = []) {
  if (!calls.size) return value;
  function walk(item) {
    if (Array.isArray(item)) return item.map(walk);
    if (!isPlainObject(item) || isBinding(item)) return item;
    if (typeof item.name === 'string' && calls.has(item.name) && isPlainObject(item.props)) {
      return profile.shape.partial(new PhpCall(calls.get(item.name), [walk(item.props), ...params]));
    }
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, walk(child)]));
  }
  return walk(value);
}

function pieces(profile) {
  const indent = (text, levels = 1) => String(text).split('\n').map(line => line ? profile.indent.repeat(levels) + line : line).join('\n');
  return {
    version: profile.version,
    indent,
    string: phpString,
    php: (value, depth = 0) => phpValue(value, { profile }, depth),
    // Literal data (meta, defaults, page data) never reads $data: markers stay
    // literal, and an empty top-level object stays a PHP array.
    data: (value, depth = 0) => isPlainObject(value) && !Object.keys(value).length
      ? '[]' : phpValue(value, { profile, bindings: false }, depth),
    comment: (lines, levels = 0) => indent(`/**\n${lines.map(line => line ? ` * ${phpDocText(line)}` : ' *').join('\n')}\n */`, levels)
  };
}

const translator = profile => text => profile.textDomain ? new PhpCall('__', [String(text ?? ''), profile.textDomain]) : String(text ?? '');

// Repeater fields: `component` fields in list mode with a plain key. Their values
// stay JSON entries ({ type, name, props }) in the defaults, the page data and the
// ACF map; the component function resolves ZVP entries (profile.templates.entries).
export function repeaterKeys(model) {
  return model.fields
    .filter(field => field.type === 'component' && field.params?.mode === 'array' && /^[A-Za-z_]\w*$/.test(field.key))
    .map(field => field.key);
}

// ZVP references become calls everywhere except in the repeater values.
function callsExcept(value, keys, calls, profile, params = []) {
  if (!keys.length || !isPlainObject(value)) return withPartialCalls(value, calls, profile, params);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, keys.includes(key) ? item : withPartialCalls(item, calls, profile, params)]));
}

// Names of the components in repeater entries (grouped entries count each item).
function entryNames(value, names = new Set()) {
  if (Array.isArray(value)) value.forEach(item => entryNames(item, names));
  else if (isPlainObject(value)) {
    if (typeof value.name === 'string') names.add(value.name);
    if (Array.isArray(value.props?.components)) entryNames(value.props.components, names);
  }
  return names;
}

// ACF bridge pieces: one sub field per mapped component field (profile.acf.fields).
// Repeater fields reach the ZVPs they accept: each ZVP gets an entry closure
// (profile.acf.entry) that maps one ACF row to a { type, name, props } entry with
// the sub fields and maps of its own fields, recursively. Vue/HTML entries have no
// ACF fields. `unitOf(model)` returns the placed unit ({ name, fn }) of a ZVP model.
function acfPieces(model, profile, base, translate, unitOf) {
  const { acf } = profile;
  const themes = (acf.buttonThemes ?? []).length > 0;
  const closures = new Map();
  const entries = new Map();
  const pending = new Set();
  let cta = false;
  function fieldPieces(owner, stack) {
    const subFields = [];
    const maps = [];
    const skipped = [];
    const uses = new Set();
    for (const field of owner.fields) {
      const k = phpString(field.key);
      const x = {
        k,
        t: translate,
        themes,
        code: code => new PhpCode(code),
        php: base.data,
        default: fallback => new PhpCode(`$defaults[${k}] ?? ${fallback}`),
        choices: options => Object.fromEntries(options.map(option => [String(option.value), translate(option.label ?? option.value)])),
        field: type => acf.fields[type]?.(field, x) ?? null,
        ctaFields: () => acf.ctaFields(x),
        entries: item => entriesOf(item, owner, stack)
      };
      const result = acf.fields[field.type]?.(field, x) ?? null;
      if (!result) { skipped.push(field.key); continue; }
      subFields.push({ name: field.key, label: translate(field.label ?? field.key), ...result.field });
      if (result.map) maps.push(result.map);
      for (const item of result.uses ?? []) uses.add(item);
    }
    if (uses.has('cta')) cta = true;
    return { subFields, maps, skipped, uses };
  }
  // ZVPs accepted by a repeater field: params.allowed, else the ZVPs of its default entries.
  function entriesOf(field, owner, stack) {
    if (!unitOf || stack.length > 4) return [];
    const allowed = field.params?.allowed?.length ? new Set(field.params.allowed) : entryNames(field.default);
    return (owner.partials ?? [])
      .filter(partial => allowed.has(partial.exportName) && !stack.includes(partial.exportName))
      .map(partial => entryOf(partial, stack))
      .filter(Boolean);
  }
  function entryOf(partial, stack) {
    const unit = unitOf(partial);
    const closure = '$entry' + unit.name;
    if (!entries.has(closure)) {
      if (pending.has(closure)) return null;
      pending.add(closure);
      const inner = fieldPieces(partial, [...stack, partial.exportName]);
      pending.delete(closure);
      const use = [...(inner.uses.has('cta') ? ['$cta'] : []), ...[...inner.uses].filter(item => item.startsWith('$'))];
      // Inner closures are inserted first, so each one is defined before it is used.
      closures.set(closure, acf.entry({ closure, name: base.string(unit.name), exportName: partial.exportName, entryName: base.string(partial.exportName), maps: inner.maps, use, indent: base.indent }));
      entries.set(closure, { closure, layout: unit.name.toLowerCase(), label: translate(partial.label), exportName: partial.exportName, subFields: inner.subFields });
    }
    return entries.get(closure);
  }
  const top = fieldPieces(model, [model.exportName]);
  const prelude = cta ? [
    '//Icon choices from the bundle icon set',
    '$icons = ZauxUIHelper::getIconSetAsList();',
    ...(themes ? ['//ZButton themes of the Zaux release', `$themes = ${base.data(acf.buttonThemes, 0)};`] : [])
  ] : [];
  return { subFields: top.subFields, maps: [...(cta ? [acf.cta] : []), ...closures.values(), ...top.maps], skipped: top.skipped, prelude };
}

// unit: { model, name, fn, dir, partials: [{ exportName, fn }] }
// options: { acf } writes the ACF bridge of a ZVC; { unitOf } names nested ZVPs.
export function emitComponent(unit, profile, options = {}) {
  const { model, name, fn, dir } = unit;
  const base = pieces(profile);
  const calls = new Map(unit.partials.map(item => [item.exportName, item.fn]));
  const params = [new PhpCode('$params')];
  const translate = translator(profile);
  const labels = { label: phpDocText(model.label), exportName: phpDocText(model.exportName), name, fn, kind: model.kind };
  const entry = dir + profile.paths.entry(model, name);
  const files = {};
  const repeaters = repeaterKeys(model);
  files[entry] = profile.templates.component({
    ...base,
    ...labels,
    native: model.native,
    snapshot: model.snapshot,
    root: withPartialCalls(profile.shape[model.kind](model, model.nodes), calls, profile, params),
    entries: repeaters.length && calls.size ? profile.templates.entries({ ...base, keys: repeaters, calls: Object.fromEntries(calls) }) : ''
  });
  files[dir + profile.paths.meta(model, name)] = profile.templates.meta({ ...base, ...labels, value: profile.meta(model, name, translate) });
  // References in the defaults are resolved when the file is read, like the data in JS.
  // Repeater values stay JSON entries, so the defaults show which components the field expects.
  files[dir + profile.paths.defaults(model, name)] = profile.templates.defaults({ ...base, ...labels, value: callsExcept(model.defaults, repeaters, calls, profile) });
  // ZVPs never become ACF layouts in zaux-wp-core.
  if (options.acf && model.kind === 'zvc') {
    files[dir + profile.paths.acf(model, name)] = profile.templates.acf({ ...base, ...labels, ...acfPieces(model, profile, base, translate, options.unitOf) });
  }
  if (model.css.trim()) files[dir + profile.paths.css(model, name)] = model.css;
  return { entry, files };
}

// page: { template, path, entries: [{ label, fn, data, partials, repeaters } | { label, node }] }
export function emitPage(page, profile) {
  const base = pieces(profile);
  return profile.templates.page({
    ...base,
    label: phpDocText(page.template.name) || 'Template',
    entries: page.entries.map(entry => {
      if (entry.node) return { label: phpDocText(entry.label), code: base.data(entry.node, 2) };
      const data = callsExcept(entry.data, entry.repeaters ?? [], new Map(entry.partials.map(item => [item.exportName, item.fn])), profile);
      const empty = isPlainObject(data) && !Object.keys(data).length;
      return { label: phpDocText(entry.label), code: `${entry.fn}(${empty ? '' : base.data(data, 2)})` };
    })
  });
}

export function emitReadme(profile, summary, files) {
  const first = summary.main ?? summary.components?.[0] ?? null;
  const example = first ? `$components = [\n    ${first.fn}([ /* field values */ ]),\n];\n\nZauxComponentsHelper::printComponentsList( $components );` : '';
  return `# Zaux PHP export

PHP components for a WordPress theme based on **zaux-wp-core** (profile v${profile.version}), e.g. a child theme like
zaux-wp-project. The parent theme autoloads every component:

- each \`<name>/\` folder goes into the theme \`components/base/\`;
- each \`_partials/<name>/\` folder goes into the theme \`components/_partials/\`;
- \`page-templates/\` goes into the theme root.

| JavaScript | PHP |
| --- | --- |
| \`<Name>.zvc.js\` / \`.zvp.js\` | \`<name>/<Name>.zvc.php\` / \`_partials/<name>/<Name>.zvp.php\` |
| \`buildNode(data, params)\` | \`ZVC<Name>($data, $params)\` / \`ZVP<Name>($data, $params)\` |
| \`<Name>.meta.js\` | \`<Name>.meta.php\` (\`ZauxComponentsHelper::getMeta()\`) |
| \`data/<Name>.defaults.js\` | \`data/<Name>.defaults.php\` (\`ZauxComponentsHelper::getDefaults()\`) |
| \`ZVCHelper.getValue\` / \`renderNode\` | \`ZauxComponentsHelper::getValue\` / \`renderNode\` |
| ZVP references | \`ZVP<Name>()\` calls wrapped in \`ComponentsRenderer\` |

Templates are WordPress page templates in \`page-templates/\`. \`style/<Name>.css\` files are not loaded by the theme:
move them into the Zaux bundle. When included, \`<Name>.acf.php\` is the ACF Flexible Content bridge of a ZVC
(sub fields named like its \`$data\` keys plus a \`map\`); declare the flexible content field with the
\`zaux_acf_flexible_fields\` filter and read it with \`ZauxACFHelper::getFlexibleNodes()\`.
${example ? `\n\`\`\`php\n${example}\n\`\`\`\n` : ''}
## Files

${Object.keys(files).sort().map(path => `- \`${path}\``).join('\n')}
`;
}
